import Claim, {
  CLAIM_TYPES,
  NEGOTIABLE_CLAIM_STATUSES,
  OPEN_CLAIM_STATUSES,
} from "../models/Claim.js";
import ClaimMessage from "../models/ClaimMessage.js";
import Listing from "../models/Listing.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";

const LISTING_CLAIMABLE_STATUSES = ["available", "pending"];

function claimTypeForListing(listingType) {
  return listingType === "exchange" ? "exchange_proposal" : "give_claim";
}

function snapshotClaim(claim) {
  if (!claim) return null;
  return {
    id: String(claim._id),
    status: claim.status,
    listingId: String(claim.listingId),
    claimerUserId: String(claim.claimerUserId),
  };
}

function snapshotListing(listing) {
  if (!listing) return null;
  return {
    id: String(listing._id),
    status: listing.status,
    acceptedClaimId: listing.acceptedClaimId
      ? String(listing.acceptedClaimId)
      : null,
    claimedByUserId: listing.claimedByUserId
      ? String(listing.claimedByUserId)
      : null,
  };
}

export async function writeAuditLog({
  entityType,
  entityId,
  action,
  actorUserId,
  previousState,
  newState,
  metadata,
  req,
}) {
  await AuditLog.create({
    entityType,
    entityId,
    action,
    actorUserId: actorUserId ?? null,
    ipAddress: req?.ip ?? "",
    userAgent: req?.get?.("user-agent") ?? "",
    previousState: previousState ?? null,
    newState: newState ?? null,
    metadata: metadata ?? {},
  });
}

export async function fanOutNotification({
  userId,
  type,
  title,
  body,
  relatedListingId,
  relatedClaimId,
  navigateSearch,
}) {
  return Notification.create({
    userId,
    type,
    title,
    body,
    relatedListingId: relatedListingId ?? null,
    relatedClaimId: relatedClaimId ?? null,
    navigateSearch: navigateSearch ?? "",
    channel: "in_app",
  });
}

/** Remove in-app notifications for a withdrawn claim (e.g. owner's "new claim" alert). */
export async function purgeNotificationsForClaim({ claimId, userId }) {
  return Notification.deleteMany({
    relatedClaimId: claimId,
    userId,
  });
}

async function countOpenClaims(listingId, excludeClaimId = null) {
  const filter = {
    listingId,
    status: { $in: OPEN_CLAIM_STATUSES },
  };
  if (excludeClaimId) {
    filter._id = { $ne: excludeClaimId };
  }
  return Claim.countDocuments(filter);
}

async function maybeRevertListingToAvailable(listing) {
  const openCount = await countOpenClaims(listing._id);
  if (openCount === 0 && listing.status === "pending") {
    listing.status = "available";
    await listing.save();
  }
}

/**
 * DFD §4.1 — INSERT claim; set listing pending; notify owner.
 * Uses sequential writes (no multi-doc transaction) so standalone MongoDB works.
 */
export async function submitClaim({
  listing,
  claimerUserId,
  message,
  offeredItem,
  req,
}) {
  const expectedType = claimTypeForListing(listing.listingType);
  if (!CLAIM_TYPES.includes(expectedType)) {
    const err = new Error("Invalid listing type for claims.");
    err.status = 400;
    err.code = "INVALID_LISTING_TYPE";
    throw err;
  }

  if (!LISTING_CLAIMABLE_STATUSES.includes(listing.status)) {
    const err = new Error("This listing is not open for claims.");
    err.status = 409;
    err.code = "LISTING_NOT_CLAIMABLE";
    throw err;
  }

  if (String(listing.ownerUserId) === String(claimerUserId)) {
    const err = new Error("You cannot claim your own listing.");
    err.status = 403;
    err.code = "SELF_CLAIM_FORBIDDEN";
    throw err;
  }

  const duplicate = await Claim.findOne({
    listingId: listing._id,
    claimerUserId,
    status: { $in: ["submitted", "pending"] },
  });
  if (duplicate) {
    const err = new Error("You already have an open claim on this listing.");
    err.status = 409;
    err.code = "DUPLICATE_OPEN_CLAIM";
    throw err;
  }

  const claim = await Claim.create({
    listingId: listing._id,
    ownerUserId: listing.ownerUserId,
    claimerUserId,
    type: expectedType,
    message: message ?? "",
    offeredItem: offeredItem ?? {},
    status: "submitted",
  });

  const prevListing = snapshotListing(listing);
  if (listing.status === "available") {
    listing.status = "pending";
    await listing.save();
  }

  await fanOutNotification({
    userId: listing.ownerUserId,
    type: "claim_submitted",
    title:
      expectedType === "give_claim"
        ? "New claim on your listing"
        : "New exchange proposal",
    body:
      message?.trim() ||
      (expectedType === "give_claim"
        ? "Someone wants your item."
        : "Someone submitted an exchange proposal."),
    relatedListingId: listing._id,
    relatedClaimId: claim._id,
  });

  await writeAuditLog({
    entityType: "claim",
    entityId: claim._id,
    action: "create",
    actorUserId: claimerUserId,
    previousState: null,
    newState: snapshotClaim(claim),
    metadata: { listingId: String(listing._id), type: expectedType },
    req,
  });

  if (prevListing?.status !== listing.status) {
    await writeAuditLog({
      entityType: "listing",
      entityId: listing._id,
      action: "status_change",
      actorUserId: claimerUserId,
      previousState: prevListing,
      newState: snapshotListing(listing),
      metadata: { reason: "claim_submitted" },
      req,
    });
  }

  return claim;
}

/**
 * DFD §4.2 — Owner accept / reject.
 */
export async function ownerReviewClaim({
  claim,
  listing,
  ownerUserId,
  action,
  message,
  req,
}) {
  if (String(claim.ownerUserId) !== String(ownerUserId)) {
    const err = new Error("Only the listing owner can review this claim.");
    err.status = 403;
    err.code = "NOT_OWNER";
    throw err;
  }

  if (!["submitted", "pending"].includes(claim.status)) {
    const err = new Error("This claim cannot be reviewed in its current state.");
    err.status = 409;
    err.code = "CLAIM_NOT_REVIEWABLE";
    throw err;
  }

  if (!["accept", "reject"].includes(action)) {
    const err = new Error("Invalid review action.");
    err.status = 400;
    err.code = "INVALID_ACTION";
    throw err;
  }

  const prevClaim = snapshotClaim(claim);
  const prevListing = snapshotListing(listing);
  const now = new Date();

  if (action === "accept") {
    if (!["available", "pending", "accepted"].includes(listing.status)) {
      const err = new Error("Listing cannot accept claims right now.");
      err.status = 409;
      err.code = "LISTING_NOT_ACCEPTING";
      throw err;
    }

    claim.status = "accepted";
    claim.ownerDecisionAt = now;
    await claim.save();

    await Claim.updateMany(
      {
        listingId: listing._id,
        _id: { $ne: claim._id },
        status: { $in: OPEN_CLAIM_STATUSES },
      },
      { $set: { status: "rejected", ownerDecisionAt: now } }
    );

    listing.status = "accepted";
    listing.acceptedClaimId = claim._id;
    listing.claimedByUserId = claim.claimerUserId;
    await listing.save();

    await fanOutNotification({
      userId: claim.claimerUserId,
      type: "claim_accepted",
      title: "Your claim was accepted",
      body: "The owner accepted your claim. Coordinate pickup or exchange details.",
      relatedListingId: listing._id,
      relatedClaimId: claim._id,
    });

    await writeAuditLog({
      entityType: "claim",
      entityId: claim._id,
      action: "accept",
      actorUserId: ownerUserId,
      previousState: prevClaim,
      newState: snapshotClaim(claim),
      req,
    });
    await writeAuditLog({
      entityType: "listing",
      entityId: listing._id,
      action: "status_change",
      actorUserId: ownerUserId,
      previousState: prevListing,
      newState: snapshotListing(listing),
      metadata: { acceptedClaimId: String(claim._id) },
      req,
    });
    return;
  }

  if (action === "reject") {
    claim.status = "rejected";
    claim.ownerDecisionAt = now;
    await claim.save();

    await maybeRevertListingToAvailable(listing);

    await fanOutNotification({
      userId: claim.claimerUserId,
      type: "claim_rejected",
      title: "Your claim was declined",
      body:
        message?.trim() ||
        "The owner declined your claim. You can browse other listings.",
      relatedListingId: listing._id,
      relatedClaimId: claim._id,
    });

    await writeAuditLog({
      entityType: "claim",
      entityId: claim._id,
      action: "reject",
      actorUserId: ownerUserId,
      previousState: prevClaim,
      newState: snapshotClaim(claim),
      metadata: message ? { ownerMessage: message } : {},
      req,
    });
    return;
  }
}

/**
 * DFD §4.3 — Mark accepted claim + listing as completed after handoff.
 */
export async function completeClaim({ claim, listing, actorUserId, req }) {
  const isOwner = String(claim.ownerUserId) === String(actorUserId);
  const isClaimer = String(claim.claimerUserId) === String(actorUserId);
  if (!isOwner && !isClaimer) {
    const err = new Error("Only the owner or claimer can complete this claim.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  if (claim.status !== "accepted") {
    const err = new Error("Only accepted claims can be completed.");
    err.status = 409;
    err.code = "CLAIM_NOT_ACCEPTED";
    throw err;
  }

  const prevClaim = snapshotClaim(claim);
  const prevListing = snapshotListing(listing);
  const now = new Date();

  claim.status = "completed";
  claim.completedAt = now;
  await claim.save();

  listing.status = "completed";
  await listing.save();

  for (const userId of [claim.ownerUserId, claim.claimerUserId]) {
    await fanOutNotification({
      userId,
      type: "claim_completed",
      title: "Exchange / give completed",
      body: "This listing has been marked complete. Thank you for using Almadot.",
      relatedListingId: listing._id,
      relatedClaimId: claim._id,
    });
  }

  await writeAuditLog({
    entityType: "claim",
    entityId: claim._id,
    action: "complete",
    actorUserId,
    previousState: prevClaim,
    newState: snapshotClaim(claim),
    req,
  });
  await writeAuditLog({
    entityType: "listing",
    entityId: listing._id,
    action: "status_change",
    actorUserId,
    previousState: prevListing,
    newState: snapshotListing(listing),
    metadata: { reason: "claim_completed" },
    req,
  });
}

/**
 * Claimer withdraws an open claim before owner decision.
 */
export async function cancelClaim({ claim, listing, claimerUserId, req }) {
  if (String(claim.claimerUserId) !== String(claimerUserId)) {
    const err = new Error("Only the claimer can cancel this claim.");
    err.status = 403;
    err.code = "NOT_CLAIMER";
    throw err;
  }

  if (!OPEN_CLAIM_STATUSES.includes(claim.status)) {
    const err = new Error("This claim can no longer be cancelled.");
    err.status = 409;
    err.code = "CLAIM_NOT_CANCELLABLE";
    throw err;
  }

  const prevClaim = snapshotClaim(claim);
  claim.status = "cancelled";
  await claim.save();

  await maybeRevertListingToAvailable(listing);

  await purgeNotificationsForClaim({
    claimId: claim._id,
    userId: claim.ownerUserId,
  });

  await writeAuditLog({
    entityType: "claim",
    entityId: claim._id,
    action: "cancel",
    actorUserId: claimerUserId,
    previousState: prevClaim,
    newState: snapshotClaim(claim),
    req,
  });
}

function canAccessClaimParties(claim, userId) {
  const uid = String(userId);
  return (
    String(claim.ownerUserId) === uid || String(claim.claimerUserId) === uid
  );
}

/**
 * List negotiation messages for a claim (owner or claimer only).
 */
export async function listClaimMessages({ claim, userId }) {
  if (!canAccessClaimParties(claim, userId)) {
    const err = new Error("You do not have access to this conversation.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  const rows = await ClaimMessage.find({ claimId: claim._id })
    .sort({ createdAt: 1 })
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    claimId: String(row.claimId),
    senderUserId: String(row.senderUserId),
    body: row.body,
    createdAt: row.createdAt,
  }));
}

/**
 * Post a negotiation message; notify the other party with deep-link to open chat.
 */
export async function sendClaimMessage({
  claim,
  listing,
  senderUserId,
  body,
  req,
}) {
  if (!canAccessClaimParties(claim, senderUserId)) {
    const err = new Error("You do not have access to this conversation.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  if (!NEGOTIABLE_CLAIM_STATUSES.includes(claim.status)) {
    const err = new Error("Negotiation is closed for this claim.");
    err.status = 409;
    err.code = "CLAIM_NOT_NEGOTIABLE";
    throw err;
  }

  const trimmed = (body ?? "").trim();
  if (!trimmed) {
    const err = new Error("Message cannot be empty.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (trimmed.length > 2000) {
    const err = new Error("Message is too long.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const message = await ClaimMessage.create({
    claimId: claim._id,
    senderUserId,
    body: trimmed,
  });

  const isOwnerSender = String(claim.ownerUserId) === String(senderUserId);
  const recipientId = isOwnerSender ? claim.claimerUserId : claim.ownerUserId;
  const claimsFocus = isOwnerSender ? "status" : "owner";
  const negotiateId = String(claim._id);
  const navigateSearch = `?claims=${claimsFocus}&negotiate=${negotiateId}`;

  const senderName = isOwnerSender ? "The listing owner" : "The claimer";
  const preview =
    trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;

  await fanOutNotification({
    userId: recipientId,
    type: "claim_message",
    title: "New negotiation message",
    body: `${senderName}: ${preview}`,
    relatedListingId: listing._id,
    relatedClaimId: claim._id,
    navigateSearch,
  });

  await writeAuditLog({
    entityType: "claim",
    entityId: claim._id,
    action: "negotiate_message",
    actorUserId: senderUserId,
    previousState: null,
    newState: { messageId: String(message._id) },
    metadata: { preview },
    req,
  });

  return message;
}
