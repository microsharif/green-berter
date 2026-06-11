export const VISIBILITY_LEVELS = Object.freeze([
  "everyone",
  "logged_in",
  "hidden",
]);

export const DEFAULT_PRIVACY = Object.freeze({
  publicDisplayName: "",
  emailVisibility: "hidden",
  phoneVisibility: "hidden",
});

export function normalizePrivacy(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    publicDisplayName: String(source.publicDisplayName ?? "").trim(),
    emailVisibility: VISIBILITY_LEVELS.includes(source.emailVisibility)
      ? source.emailVisibility
      : DEFAULT_PRIVACY.emailVisibility,
    phoneVisibility: VISIBILITY_LEVELS.includes(source.phoneVisibility)
      ? source.phoneVisibility
      : DEFAULT_PRIVACY.phoneVisibility,
  };
}

export function resolveDisplayName(user) {
  if (!user) return "";
  const privacy = normalizePrivacy(user.privacy);
  return privacy.publicDisplayName || String(user.fullName ?? "").trim();
}

export function isVisibleToViewer(visibility, viewerUserId, ownerUserId) {
  if (visibility === "everyone") return true;
  if (String(viewerUserId) === String(ownerUserId)) return true;
  if (visibility === "logged_in") return Boolean(viewerUserId);
  return false;
}

/**
 * Compact seller/claimer card attached to listings and claims.
 * `fullName` carries the resolved public display name for existing clients.
 */
export function buildPartyProfile(user, viewerUserId) {
  if (!user) return null;
  const privacy = normalizePrivacy(user.privacy);
  const party = {
    id: String(user._id),
    fullName: resolveDisplayName(user),
    profileImageUrl: user.profileImageUrl ?? "",
  };

  if (
    isVisibleToViewer(privacy.emailVisibility, viewerUserId, user._id) &&
    user.email
  ) {
    party.email = user.email;
  }
  if (
    isVisibleToViewer(privacy.phoneVisibility, viewerUserId, user._id) &&
    user.phone
  ) {
    party.phone = user.phone;
  }

  return party;
}

/**
 * Public user document for GET /users/:id and list endpoints.
 * Owners receive their full profile plus privacy settings.
 */
export function buildPublicUserResponse(user, viewerUserId) {
  const obj = user.toObject ? user.toObject({ versionKey: false }) : { ...user };
  delete obj.passwordHash;

  const isOwner =
    viewerUserId && String(viewerUserId) === String(obj._id ?? obj.id);
  const privacy = normalizePrivacy(obj.privacy);

  if (isOwner) {
    return {
      ...obj,
      privacy,
    };
  }

  const response = {
    _id: obj._id,
    fullName: resolveDisplayName(obj),
    profileImageUrl: obj.profileImageUrl ?? "",
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };

  if (
    isVisibleToViewer(privacy.emailVisibility, viewerUserId, obj._id) &&
    obj.email
  ) {
    response.email = obj.email;
  }
  if (
    isVisibleToViewer(privacy.phoneVisibility, viewerUserId, obj._id) &&
    obj.phone
  ) {
    response.phone = obj.phone;
  }

  return response;
}

export function validatePrivacyPatch(payload) {
  const errors = {};
  const patch = {};

  if (payload.publicDisplayName !== undefined) {
    const publicDisplayName = String(payload.publicDisplayName ?? "").trim();
    if (publicDisplayName.length > 60) {
      errors.publicDisplayName = "Display name must be 60 characters or fewer.";
    } else {
      patch.publicDisplayName = publicDisplayName;
    }
  }

  if (payload.emailVisibility !== undefined) {
    const value = String(payload.emailVisibility ?? "").trim();
    if (!VISIBILITY_LEVELS.includes(value)) {
      errors.emailVisibility = "Invalid email visibility option.";
    } else {
      patch.emailVisibility = value;
    }
  }

  if (payload.phoneVisibility !== undefined) {
    const value = String(payload.phoneVisibility ?? "").trim();
    if (!VISIBILITY_LEVELS.includes(value)) {
      errors.phoneVisibility = "Invalid phone visibility option.";
    } else {
      patch.phoneVisibility = value;
    }
  }

  return { errors, patch };
}
