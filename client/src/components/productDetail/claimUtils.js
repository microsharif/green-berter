/** Listing statuses where new claims can be submitted (server-aligned). */
export const CLAIMABLE_LISTING_STATUSES = ["available", "pending"];

export const OPEN_CLAIM_STATUSES = ["submitted", "pending", "accepted"];

/** Claims where negotiation chat is available. */
export const NEGOTIABLE_CLAIM_STATUSES = ["submitted", "pending", "accepted"];

const LISTING_STATUS_LABELS = {
  available: "Available",
  pending: "Pending claims",
  accepted: "Claim accepted",
  completed: "Completed",
  rejected: "Closed",
  cancelled: "Cancelled",
};

const CLAIM_STATUS_LABELS = {
  submitted: "Submitted — awaiting owner",
  pending: "Under review",
  accepted: "Accepted — coordinate handoff",
  rejected: "Declined",
  completed: "Completed",
  cancelled: "Withdrawn",
};

export function listingStatusLabel(status) {
  return LISTING_STATUS_LABELS[status] ?? status ?? "Unknown";
}

export function claimStatusLabel(status) {
  return CLAIM_STATUS_LABELS[status] ?? status ?? "Unknown";
}

export function isListingClaimable(status) {
  return CLAIMABLE_LISTING_STATUSES.includes(status);
}

export function isMongoListingId(id) {
  return /^[a-f0-9]{24}$/i.test(String(id ?? ""));
}

/** Most relevant claim row for the signed-in claimer on this listing. */
export function pickMyClaim(claims, userId) {
  if (!userId || !Array.isArray(claims)) return null;
  const mine = claims.filter((c) => String(c.claimerUserId) === String(userId));
  if (!mine.length) return null;
  const priority = ["accepted", "submitted", "pending"];
  for (const status of priority) {
    const hit = mine.find((c) => c.status === status);
    if (hit) return hit;
  }
  const open = mine.find((c) => OPEN_CLAIM_STATUSES.includes(c.status));
  if (open) return open;
  return mine.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

/** Claims the owner still needs to act on. */
export function pendingOwnerReview(claims) {
  return (claims ?? []).filter((c) => ["submitted", "pending"].includes(c.status));
}

/** Max claim cards shown in the profile/product incoming preview list. */
export const INCOMING_CLAIMS_PREVIEW_LIMIT = 5;

/** DOM id for a profile claim row (deep-link scroll from notifications). */
export function claimRowDomId(claimId) {
  if (!claimId) return undefined;
  return `claim-row-${claimId}`;
}

/** Scroll a profile claim card into view (e.g. after opening negotiate from notification). */
export function scrollClaimCardIntoView(claimId, { behavior = "smooth" } = {}) {
  if (!claimId || typeof document === "undefined") return false;
  const el = document.getElementById(claimRowDomId(claimId));
  if (!el) return false;
  el.scrollIntoView({ behavior, block: "center" });
  return true;
}

/** Retry scroll after chat panel layout (card height expands when open). */
export function scrollClaimCardIntoViewDeferred(claimId) {
  if (!claimId) return () => {};
  const run = () => scrollClaimCardIntoView(claimId);
  run();
  const t1 = window.setTimeout(run, 150);
  const t2 = window.setTimeout(run, 450);
  return () => {
    window.clearTimeout(t1);
    window.clearTimeout(t2);
  };
}

/** Newest pending claims for the inline preview (newest first). */
export function latestIncomingClaimsPreview(
  claims,
  limit = INCOMING_CLAIMS_PREVIEW_LIMIT
) {
  return [...pendingOwnerReview(claims)]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

const ACTIVE_CLAIMER_STATUSES = ["submitted", "pending", "accepted"];

/** Claimer's own open claims / proposals on profile. */
export function activeClaimerClaims(claims) {
  return (claims ?? []).filter((c) =>
    ACTIVE_CLAIMER_STATUSES.includes(c.status)
  );
}

/** Newest active claimer claims for the profile preview (newest first). */
export function latestClaimerClaimsPreview(
  claims,
  limit = INCOMING_CLAIMS_PREVIEW_LIMIT
) {
  return [...activeClaimerClaims(claims)]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

/** Shell styles for claim/proposal cards when negotiation chat is open. */
export function claimCardShellClass(chatOpen, { variant = "default" } = {}) {
  const base =
    "relative overflow-hidden rounded-2xl transition-all duration-300 ease-out";
  const border =
    variant === "primary"
      ? "border border-primary/20 bg-primary-container/10"
      : "border border-outline-variant/20 bg-surface-container-low";
  if (!chatOpen) {
    const pad = variant === "primary" ? "p-5" : "p-4";
    return `${base} ${border} ${pad} space-y-3`;
  }
  const pad = variant === "primary" ? "p-5" : "p-4";
  return `${base} ${border} ${pad} h-[380px] min-h-[380px] max-h-[380px] -mx-2 w-[calc(100%+1rem)] shadow-lg ring-2 ring-primary/15 z-10`;
}

/** Whether to show the negotiation prompt banner on profile claim cards. */
export function shouldShowNegotiationBanner(
  role,
  { canNegotiate, unreadNegotiation, fromOwner, fromClaimer, bothMessaged }
) {
  if (!canNegotiate) return false;
  if (bothMessaged) return true;
  if (unreadNegotiation) return true;
  if (role === "claimer" && fromOwner) return true;
  if (role === "owner" && fromClaimer) return true;
  return false;
}

/** Banner copy for profile negotiation prompts. */
export function negotiationBannerText(role, { bothMessaged }) {
  if (bothMessaged) return "Ongoing negotiation";
  if (role === "claimer") {
    return "The listing owner wants to negotiate with you.";
  }
  return "The claimer wants to negotiate with you.";
}

/**
 * Negotiation status for tables and summaries (owner or claimer view).
 * Returns null when there is nothing to show.
 */
export function negotiationStatusLabel(
  role,
  {
    canNegotiate,
    bothMessaged,
    fromOwner,
    fromClaimer,
    hasMessages,
    unreadNegotiation,
  }
) {
  if (!canNegotiate) return null;
  if (bothMessaged) return "Ongoing negotiation";
  if (unreadNegotiation) {
    return negotiationBannerText(role, { bothMessaged: false });
  }
  if (role === "owner" && fromClaimer) {
    return negotiationBannerText("owner", { bothMessaged: false });
  }
  if (role === "claimer" && fromOwner) {
    return negotiationBannerText("claimer", { bothMessaged: false });
  }
  if (hasMessages && fromOwner && !fromClaimer) {
    return "Awaiting claimer reply";
  }
  if (hasMessages && fromClaimer && !fromOwner) {
    return negotiationBannerText(role, { bothMessaged: false });
  }
  return null;
}
