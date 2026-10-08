import mongoose from "mongoose";
import Listing, { LISTING_STATUSES } from "../../models/Listing.js";
import Claim from "../../models/Claim.js";
import User from "../../models/User.js";
import { LISTING_TYPES } from "../../models/ListingCategory.js";
import { deleteStoredImage } from "../../services/imageStorage.service.js";
import { writeAdminAudit } from "../../utils/adminAudit.js";

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function attachOwner(listingJSON, ownerMap) {
  const owner = ownerMap.get(listingJSON.ownerUserId);
  return {
    ...listingJSON,
    owner: owner
      ? {
          id: String(owner._id),
          fullName: owner.fullName,
          email: owner.email,
          profileImageUrl: owner.profileImageUrl ?? "",
          status: owner.status,
        }
      : null,
  };
}

/**
 * GET /api/v1/admin/listings
 *
 * Every listing (all statuses) with search/filter/sort/pagination.
 */
export async function listListings(req, res, next) {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    const query = {};
    const status = asString(req.query.status);
    if (status && LISTING_STATUSES.includes(status)) query.status = status;

    const listingType = asString(req.query.listingType);
    if (LISTING_TYPES.includes(listingType)) query.listingType = listingType;

    const categoryId = asString(req.query.categoryId);
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      query.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const areaId = asString(req.query.areaId);
    if (areaId && mongoose.isValidObjectId(areaId)) {
      query.areaId = new mongoose.Types.ObjectId(areaId);
    }

    const search = asString(req.query.search);
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.title = new RegExp(safe, "i");
    }

    const sortField = ["createdAt", "title", "status"].includes(
      req.query.sortBy
    )
      ? req.query.sortBy
      : "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ [sortField]: sortDir })
        .skip(offset)
        .limit(limit),
      Listing.countDocuments(query),
    ]);

    const ownerIds = [...new Set(listings.map((l) => String(l.ownerUserId)))];
    const owners = await User.find({ _id: { $in: ownerIds } })
      .select("fullName email profileImageUrl status")
      .lean();
    const ownerMap = new Map(owners.map((o) => [String(o._id), o]));

    return res.json({
      ok: true,
      listings: listings.map((l) => attachOwner(l.toPublicJSON(), ownerMap)),
      total,
      limit,
      offset,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/listings/:id
 *
 * Single listing with owner + full claim / swap history.
 */
export async function getListing(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const [owner, claims] = await Promise.all([
      User.findById(listing.ownerUserId)
        .select("fullName email phone profileImageUrl status")
        .lean(),
      Claim.find({ listingId: listing._id }).sort({ createdAt: -1 }),
    ]);

    const claimerIds = [...new Set(claims.map((c) => String(c.claimerUserId)))];
    const claimers = await User.find({ _id: { $in: claimerIds } })
      .select("fullName email profileImageUrl")
      .lean();
    const claimerMap = new Map(claimers.map((c) => [String(c._id), c]));

    return res.json({
      ok: true,
      listing: listing.toPublicJSON(),
      owner: owner
        ? {
            id: String(owner._id),
            fullName: owner.fullName,
            email: owner.email,
            phone: owner.phone ?? "",
            profileImageUrl: owner.profileImageUrl ?? "",
            status: owner.status,
          }
        : null,
      claims: claims.map((c) => {
        const json = c.toPublicJSON();
        const claimer = claimerMap.get(json.claimerUserId);
        return {
          ...json,
          claimer: claimer
            ? {
                id: String(claimer._id),
                fullName: claimer.fullName,
                email: claimer.email,
                profileImageUrl: claimer.profileImageUrl ?? "",
              }
            : null,
        };
      }),
    });
  } catch (err) {
    return next(err);
  }
}

const EDITABLE_FIELDS = new Set(["title", "story", "tags"]);

/**
 * PATCH /api/v1/admin/listings/:id
 *
 * Edit basic listing fields. Status moderation goes through the status
 * endpoint below.
 */
export async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const incoming = req.body ?? {};
    for (const key of Object.keys(incoming)) {
      if (!EDITABLE_FIELDS.has(key)) {
        return res.status(400).json({
          ok: false,
          code: "FIELD_NOT_PATCHABLE",
          message: `Field "${key}" cannot be edited via this endpoint.`,
        });
      }
    }
    if (Object.keys(incoming).length === 0) {
      return res.status(400).json({
        ok: false,
        code: "EMPTY_PATCH",
        message: "Send at least one field to update.",
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const errors = {};
    const previous = {};
    if (incoming.title !== undefined) {
      const title = asString(incoming.title);
      if (!title) errors.title = "Title is required";
      else if (title.length > 200) errors.title = "Title is too long";
      else {
        previous.title = listing.title;
        listing.title = title;
      }
    }
    if (incoming.story !== undefined) {
      const story = asString(incoming.story);
      if (!story) errors.story = "Story is required";
      else if (story.length > 5000) errors.story = "Story is too long";
      else {
        previous.story = listing.story;
        listing.story = story;
      }
    }
    if (incoming.tags !== undefined) {
      if (!Array.isArray(incoming.tags)) {
        errors.tags = "Tags must be an array";
      } else {
        previous.tags = listing.tags;
        listing.tags = incoming.tags.map((t) => asString(t)).filter(Boolean);
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    await listing.save();

    await writeAdminAudit(req, {
      entityType: "listing",
      entityId: listing._id,
      action: "update",
      previousState: previous,
      newState: incoming,
    });

    return res.json({
      ok: true,
      message: "Listing updated.",
      listing: listing.toPublicJSON(),
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      const fieldErrors = {};
      for (const [field, detail] of Object.entries(err.errors)) {
        fieldErrors[field] = detail.message;
      }
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors: fieldErrors,
      });
    }
    return next(err);
  }
}

// Moderation action → resulting listing status.
const STATUS_ACTIONS = {
  approve: "available",
  reject: "rejected",
};

/**
 * PATCH /api/v1/admin/listings/:id/status
 *
 * Approve (→ available) or reject (→ rejected) a listing.
 */
export async function changeListingStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const action = asString(req.body?.action);
    const nextStatus = STATUS_ACTIONS[action];
    if (!nextStatus) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: `action must be one of: ${Object.keys(STATUS_ACTIONS).join(", ")}`,
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const previousStatus = listing.status;
    listing.status = nextStatus;
    await listing.save();

    await writeAdminAudit(req, {
      entityType: "listing",
      entityId: listing._id,
      action: "status_change",
      previousState: { status: previousStatus },
      newState: { status: nextStatus },
      metadata: { reason: asString(req.body?.reason) || undefined },
    });

    return res.json({
      ok: true,
      message: `Listing ${action}d.`,
      listing: listing.toPublicJSON(),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/v1/admin/listings/:id
 *
 * Hard-deletes a listing and best-effort removes its images from disk.
 */
export async function removeListing(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }

    const images = [listing.imageUrl, ...(listing.gallery ?? [])].filter(
      Boolean
    );
    const snapshot = {
      title: listing.title,
      ownerUserId: String(listing.ownerUserId),
      status: listing.status,
    };

    await listing.deleteOne();

    // Fire-and-forget image cleanup.
    for (const url of images) {
      deleteStoredImage(url).catch(() => {});
    }

    await writeAdminAudit(req, {
      entityType: "listing",
      entityId: listing._id,
      action: "delete",
      previousState: snapshot,
    });

    return res.json({ ok: true, message: "Listing deleted." });
  } catch (err) {
    return next(err);
  }
}
