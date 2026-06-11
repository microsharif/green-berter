import mongoose from "mongoose";
import Claim, { CLAIM_STATUSES } from "../models/Claim.js";
import Listing from "../models/Listing.js";
import { UPLOAD_KINDS, isOwnedUploadUrl } from "../config/upload.js";
import {
  submitClaim,
  ownerReviewClaim,
  completeClaim,
  cancelClaim,
  listClaimMessages,
  sendClaimMessage,
} from "../services/claim.service.js";
import { buildPartyProfile } from "../utils/userPrivacy.js";

const MAX_MESSAGE_LEN = 2000;
const MAX_OFFER_TITLE_LEN = 200;
const MAX_OFFER_NOTES_LEN = 1000;

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** YYYY-MM-DD → start of UTC day for createdAt filter. */
function parseReceivedFrom(value) {
  const s = asString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD → end of UTC day for createdAt filter. */
function parseReceivedTo(value) {
  const s = asString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function canAccessClaim(claim, userId) {
  const uid = String(userId);
  return (
    String(claim.ownerUserId) === uid || String(claim.claimerUserId) === uid
  );
}

async function attachParties(claimJson, viewerUserId = null) {
  const User = mongoose.model("User");
  const [owner, claimer, listing] = await Promise.all([
    User.findById(claimJson.ownerUserId)
      .select("_id fullName email phone profileImageUrl privacy")
      .lean(),
    User.findById(claimJson.claimerUserId)
      .select("_id fullName email phone profileImageUrl privacy")
      .lean(),
    Listing.findById(claimJson.listingId).select("title").lean(),
  ]);
  if (owner) {
    claimJson.owner = buildPartyProfile(owner, viewerUserId);
  }
  if (claimer) {
    claimJson.claimer = buildPartyProfile(claimer, viewerUserId);
  }
  if (listing?.title) {
    claimJson.listingTitle = listing.title;
  }
  return claimJson;
}

function validateSubmitBody(body, listing) {
  const errors = {};
  const message = asString(body.message);
  if (message.length > MAX_MESSAGE_LEN) {
    errors.message = "Message is too long";
  }

  let offeredItem = {};
  if (listing.listingType === "exchange") {
    const raw = body.offeredItem ?? {};
    const title = asString(raw.title);
    if (!title) errors["offeredItem.title"] = "Offered item title is required";
    else if (title.length > MAX_OFFER_TITLE_LEN) {
      errors["offeredItem.title"] = "Title is too long";
    }

    const imageUrl = asString(raw.imageUrl);
    if (imageUrl && !isOwnedUploadUrl(imageUrl, UPLOAD_KINDS.PRODUCT)) {
      errors["offeredItem.imageUrl"] = "Invalid image reference";
    }

    const notes = asString(raw.notes);
    if (notes.length > MAX_OFFER_NOTES_LEN) {
      errors["offeredItem.notes"] = "Notes are too long";
    }

    offeredItem = { title, imageUrl, notes };
  }

  return { errors, message, offeredItem };
}

/**
 * POST /api/v1/claims
 *
 * DFD §4 process 1 — submit Give claim or Exchange proposal.
 */
export async function createClaim(req, res, next) {
  try {
    const listingId = asString(req.body?.listingId);
    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "A valid listingId is required.",
        errors: { listingId: "Listing id is required" },
      });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const { errors, message, offeredItem } = validateSubmitBody(
      req.body ?? {},
      listing
    );
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    const claim = await submitClaim({
      listing,
      claimerUserId: req.userId,
      message,
      offeredItem,
      req,
    });

    const fresh = await Claim.findById(claim._id);
    return res.status(201).json({
      ok: true,
      message: "Claim submitted.",
      claim: await attachParties(fresh.toPublicJSON(), req.userId ?? null),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        ok: false,
        code: err.code,
        message: err.message,
      });
    }
    return next(err);
  }
}

/**
 * GET /api/v1/claims
 *
 * Query params:
 *   listingId  — claims on one listing (owner sees all; claimer sees own)
 *   role       — "owner" | "claimer" (scoped to current user)
 *   status     — filter by claim status
 *   claimType  — "give_claim" | "exchange_proposal" (or give / exchange)
 *   search     — case-insensitive substring match on listing title
 *   pendingReview — "true" → submitted + pending only
 *   receivedFrom, receivedTo — YYYY-MM-DD filter on createdAt
 *   limit, offset — pagination
 */
export async function listClaims(req, res, next) {
  try {
    const query = {};
    const listingId = asString(req.query.listingId);
    const role = asString(req.query.role);
    const status = asString(req.query.status);
    const pendingReview = asString(req.query.pendingReview) === "true";
    const claimTypeRaw = asString(req.query.claimType);
    const search = asString(req.query.search);

    if (pendingReview) {
      query.status = { $in: ["submitted", "pending"] };
    } else if (status && CLAIM_STATUSES.includes(status)) {
      query.status = status;
    }

    if (claimTypeRaw === "give_claim" || claimTypeRaw === "exchange_proposal") {
      query.type = claimTypeRaw;
    } else if (claimTypeRaw === "give") {
      query.type = "give_claim";
    } else if (claimTypeRaw === "exchange") {
      query.type = "exchange_proposal";
    }

    const receivedFrom = parseReceivedFrom(req.query.receivedFrom);
    const receivedTo = parseReceivedTo(req.query.receivedTo);
    if (receivedFrom || receivedTo) {
      query.createdAt = {};
      if (receivedFrom) query.createdAt.$gte = receivedFrom;
      if (receivedTo) query.createdAt.$lte = receivedTo;
    }

    if (listingId) {
      if (!mongoose.isValidObjectId(listingId)) {
        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Invalid listing id.",
        });
      }
      const listing = await Listing.findById(listingId).select("ownerUserId");
      if (!listing) {
        return res.status(404).json({
          ok: false,
          code: "LISTING_NOT_FOUND",
          message: "Listing not found.",
        });
      }
      query.listingId = listingId;
      const isOwner = String(listing.ownerUserId) === String(req.userId);
      if (!isOwner) {
        query.claimerUserId = req.userId;
      }
    } else if (role === "owner") {
      query.ownerUserId = req.userId;
    } else if (role === "claimer") {
      query.claimerUserId = req.userId;
    } else {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Provide listingId or role=owner|claimer.",
      });
    }

    if (search) {
      const listingFilter = {
        title: { $regex: escapeRegex(search), $options: "i" },
      };
      if (query.ownerUserId) {
        listingFilter.ownerUserId = query.ownerUserId;
      }
      if (query.claimerUserId) {
        const claimListingIds = await Claim.distinct("listingId", {
          claimerUserId: query.claimerUserId,
        });
        listingFilter._id = { $in: claimListingIds };
      }
      if (query.listingId) {
        listingFilter._id = query.listingId;
      }
      const matched = await Listing.find(listingFilter).select("_id").lean();
      query.listingId = { $in: matched.map((row) => row._id) };
    }

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 24)
    );
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);

    const [items, total] = await Promise.all([
      Claim.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Claim.countDocuments(query),
    ]);

    const claims = await Promise.all(
      items.map((c) => attachParties(c.toPublicJSON(), req.userId ?? null))
    );

    return res.json({ ok: true, claims, total, limit, offset });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/claims/:id
 */
export async function getClaim(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }
    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }
    if (!canAccessClaim(claim, req.userId)) {
      return res.status(403).json({
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to this claim.",
      });
    }
    return res.json({
      ok: true,
      claim: await attachParties(claim.toPublicJSON(), req.userId ?? null),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/claims/:id/messages — negotiation thread for owner or claimer.
 */
export async function getClaimMessages(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }
    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }

    const messages = await listClaimMessages({
      claim,
      userId: req.userId,
    });

    return res.json({ ok: true, messages });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        ok: false,
        code: err.code,
        message: err.message,
      });
    }
    return next(err);
  }
}

/**
 * POST /api/v1/claims/:id/messages — send a negotiation message.
 */
export async function postClaimMessage(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }

    const body = asString(req.body?.body);
    if (!body) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Message body is required.",
        errors: { body: "Message body is required" },
      });
    }

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }

    const listing = await Listing.findById(claim.listingId);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const message = await sendClaimMessage({
      claim,
      listing,
      senderUserId: req.userId,
      body,
      req,
    });

    const json = message.toPublicJSON();
    return res.status(201).json({
      ok: true,
      message: json,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        ok: false,
        code: err.code,
        message: err.message,
      });
    }
    return next(err);
  }
}

/**
 * PATCH /api/v1/claims/:id
 *
 * Body: `{ action: "accept"|"reject"|"complete"|"cancel", message? }`
 *
 * DFD §4 processes 2–3 — owner review and lifecycle completion.
 */
export async function updateClaim(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }

    const action = asString(req.body?.action);
    const message = asString(req.body?.message);
    if (!action) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "action is required.",
        errors: { action: "action is required" },
      });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Message is too long.",
        errors: { message: "Message is too long" },
      });
    }

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        ok: false,
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found.",
      });
    }

    const listing = await Listing.findById(claim.listingId);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    if (["accept", "reject"].includes(action)) {
      await ownerReviewClaim({
        claim,
        listing,
        ownerUserId: req.userId,
        action,
        message,
        req,
      });
    } else if (action === "complete") {
      await completeClaim({
        claim,
        listing,
        actorUserId: req.userId,
        req,
      });
    } else if (action === "cancel") {
      await cancelClaim({
        claim,
        listing,
        claimerUserId: req.userId,
        req,
      });
    } else {
      return res.status(400).json({
        ok: false,
        code: "INVALID_ACTION",
        message: "action must be accept, reject, complete, or cancel.",
      });
    }

    const freshClaim = await Claim.findById(id);
    const freshListing = await Listing.findById(listing._id);

    return res.json({
      ok: true,
      message: `Claim ${action} recorded.`,
      claim: await attachParties(freshClaim.toPublicJSON(), req.userId ?? null),
      listing: freshListing.toPublicJSON(),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        ok: false,
        code: err.code,
        message: err.message,
      });
    }
    return next(err);
  }
}
