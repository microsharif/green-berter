/**
 * Where to send the user when they open a notification (DFD §4.4).
 *
 * claim_message → profile Claims with negotiate chat for that claim (owner or claimer).
 * Owner claim_submitted → profile Claims inbox.
 * Claimer (other) → listing detail for status only (no chat on listing page).
 */
export function notificationTarget(notification) {
  const listingId = notification?.relatedListingId;
  const claimId = notification?.relatedClaimId;
  if (!listingId) {
    return { pathname: "/profile", hash: "#claims" };
  }

  const type = notification?.type ?? "";
  const search = notification?.navigateSearch
    ? notification.navigateSearch.startsWith("?")
      ? notification.navigateSearch
      : `?${notification.navigateSearch}`
    : "";

  if (type === "claim_message" && claimId) {
    return {
      pathname: "/profile",
      search: `?negotiate=${claimId}`,
      hash: "#claims",
    };
  }

  if (type === "claim_submitted" || search.includes("claims=owner")) {
    return { pathname: "/profile", hash: "#claims" };
  }

  if (search.includes("claims=status")) {
    return {
      pathname: `/products/${listingId}`,
      search: "?claims=status",
    };
  }

  if (search) {
    return {
      pathname: `/products/${listingId}`,
      search,
    };
  }

  return {
    pathname: `/products/${listingId}`,
    search: "?claims=status",
  };
}

export function notificationIcon(type) {
  switch (type) {
    case "claim_submitted":
      return "mark_email_unread";
    case "claim_accepted":
      return "check_circle";
    case "claim_rejected":
      return "cancel";
    case "claim_message":
      return "chat";
    case "claim_completed":
      return "celebration";
    default:
      return "notifications";
  }
}
