import mongoose from "mongoose";
import User from "../models/User.js";
import {
  destroySession,
  destroyAllSessionsForUser,
} from "../services/session.service.js";
import {
  SESSION_COOKIE_NAME,
} from "../config/session.js";
import { UPLOAD_KINDS, isOwnedUploadUrl } from "../config/upload.js";
import { deleteStoredImage } from "../services/imageStorage.service.js";
import {
  buildPublicUserResponse,
  normalizePrivacy,
  validatePrivacyPatch,
} from "../utils/userPrivacy.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

async function discardProfileImage(url) {
  if (!url) return;
  try {
    await deleteStoredImage(url);
  } catch {
    /* best-effort orphan cleanup */
  }
}

function validateCreatePayload(payload) {
  const errors = {};
  const fullName = asString(payload.fullName);
  const email = asString(payload.email).toLowerCase();
  const phone = asString(payload.phone);
  const address = asString(payload.address);
  const password = payload.password ?? "";

  const rawProfileImageUrl =
    typeof payload.profileImageUrl === "string"
      ? payload.profileImageUrl.trim()
      : "";
  let profileImageUrl = "";
  if (rawProfileImageUrl) {
    if (isOwnedUploadUrl(rawProfileImageUrl, UPLOAD_KINDS.PROFILE)) {
      profileImageUrl = rawProfileImageUrl;
    } else {
      errors.profileImageUrl = "Invalid profile image reference.";
    }
  }

  if (!fullName) errors.fullName = "Full name is required";
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email address";
  if (!phone) errors.phone = "Phone is required";
  if (!address) errors.address = "Address is required";
  if (!password) errors.password = "Password is required";
  else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return {
    errors,
    cleaned: { fullName, email, phone, address, password, profileImageUrl },
  };
}

const PATCHABLE_FIELDS = new Set([
  "fullName",
  "phone",
  "address",
  "profileImageUrl",
  "password",
  "email",
]);

function validatePatchPayload(payload, existingUser) {
  const errors = {};
  const patch = {};

  if (payload.fullName !== undefined) {
    const fullName = asString(payload.fullName);
    if (!fullName) errors.fullName = "Full name is required";
    else patch.fullName = fullName;
  }

  if (payload.phone !== undefined) {
    patch.phone = asString(payload.phone);
  }

  if (payload.address !== undefined) {
    patch.address = asString(payload.address);
  }

  if (payload.email !== undefined) {
    const email = asString(payload.email).toLowerCase();
    if (!email) errors.email = "Email is required";
    else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email address";
    else if (email !== existingUser.email) patch.email = email;
  }

  if (payload.profileImageUrl !== undefined) {
    const raw = asString(payload.profileImageUrl);
    if (!raw) {
      patch.profileImageUrl = "";
    } else if (!isOwnedUploadUrl(raw, UPLOAD_KINDS.PROFILE)) {
      errors.profileImageUrl = "Invalid profile image reference.";
    } else {
      patch.profileImageUrl = raw;
    }
  }

  if (payload.password !== undefined) {
    const password = payload.password ?? "";
    if (!password) errors.password = "Password is required";
    else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    } else {
      patch.password = password;
    }
  }

  return { errors, patch };
}

/**
 * POST /api/v1/users
 *
 * Inserts a row into the `users` collection. Mirrors the registration
 * validation used by `POST /auth/register` but lives on the users resource.
 */
export async function createUser(req, res, next) {
  const { errors, cleaned } = validateCreatePayload(req.body ?? {});
  if (Object.keys(errors).length > 0) {
    await discardProfileImage(cleaned.profileImageUrl);
    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields.",
      errors,
    });
  }

  try {
    const existing = await User.findOne({ email: cleaned.email })
      .select("_id")
      .lean();
    if (existing) {
      await discardProfileImage(cleaned.profileImageUrl);
      return res.status(409).json({
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
      });
    }

    const user = new User({
      fullName: cleaned.fullName,
      email: cleaned.email,
      phone: cleaned.phone,
      address: cleaned.address,
      profileImageUrl: cleaned.profileImageUrl,
    });
    user.password = cleaned.password;
    await user.save();

    return res.status(201).json({
      ok: true,
      message: "User created.",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.email) {
      await discardProfileImage(cleaned.profileImageUrl);
      return res.status(409).json({
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
      });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      await discardProfileImage(cleaned.profileImageUrl);
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
    await discardProfileImage(cleaned.profileImageUrl);
    return next(err);
  }
}

/**
 * GET /api/v1/users
 *
 * Lists active users (public fields only). Supports pagination.
 */
export async function listUsers(req, res, next) {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 24, 1),
      100
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    const query = { status: "active" };
    const email = asString(req.query.email).toLowerCase();
    if (email) query.email = email;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      users: users.map((doc) => {
        const userDoc = User.hydrate(doc);
        return buildPublicUserResponse(userDoc, req.userId ?? null);
      }),
      total,
      limit,
      offset,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/users/:id
 *
 * Returns a single active user by id (public profile fields).
 */
export async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    const user = await User.findById(id);
    if (!user || user.status !== "active") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    return res.json({
      ok: true,
      user: buildPublicUserResponse(user, req.userId ?? null),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/users/:id
 *
 * Owner-only profile update (DFD §3 — edit profile shell).
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    if (String(req.userId) !== String(id)) {
      return res.status(403).json({
        ok: false,
        code: "NOT_OWNER",
        message: "You can only update your own profile.",
      });
    }

    const incoming = req.body ?? {};
    for (const key of Object.keys(incoming)) {
      if (!PATCHABLE_FIELDS.has(key)) {
        return res.status(400).json({
          ok: false,
          code: "FIELD_NOT_PATCHABLE",
          message: `Field "${key}" cannot be edited via PATCH.`,
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

    const user = await User.findById(id);
    if (!user || user.status === "deleted") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }
    if (user.status !== "active") {
      return res.status(403).json({
        ok: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "This account cannot be updated.",
      });
    }

    const { errors, patch } = validatePatchPayload(incoming, user);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }
    if (Object.keys(patch).length === 0) {
      return res.json({
        ok: true,
        message: "No changes.",
        user: user.toPublicJSON(),
      });
    }

    if (patch.email && patch.email !== user.email) {
      const taken = await User.findOne({ email: patch.email })
        .select("_id")
        .lean();
      if (taken) {
        return res.status(409).json({
          ok: false,
          code: "EMAIL_TAKEN",
          message: "An account with this email already exists.",
        });
      }
    }

    let previousImageToDelete = null;
    if (
      patch.profileImageUrl !== undefined &&
      patch.profileImageUrl !== user.profileImageUrl
    ) {
      if (user.profileImageUrl) previousImageToDelete = user.profileImageUrl;
    }

    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.phone !== undefined) user.phone = patch.phone;
    if (patch.address !== undefined) user.address = patch.address;
    if (patch.email !== undefined) user.email = patch.email;
    if (patch.profileImageUrl !== undefined) {
      user.profileImageUrl = patch.profileImageUrl;
    }
    if (patch.password !== undefined) {
      user.password = patch.password;
    }

    await user.save();

    if (previousImageToDelete) {
      discardProfileImage(previousImageToDelete);
    }

    return res.json({
      ok: true,
      message: "Profile updated.",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.email) {
      return res.status(409).json({
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
      });
    }
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

/**
 * GET /api/v1/users/me/settings
 *
 * Returns privacy settings for the signed-in user.
 */
export async function getMySettings(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.status !== "active") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    return res.json({
      ok: true,
      privacy: normalizePrivacy(user.privacy),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/users/me/settings
 *
 * Updates privacy settings for the signed-in user.
 */
export async function patchMySettings(req, res, next) {
  try {
    const incoming = req.body ?? {};
    const { errors, patch } = validatePrivacyPatch(incoming);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({
        ok: false,
        code: "EMPTY_PATCH",
        message: "Send at least one privacy field to update.",
      });
    }

    const user = await User.findById(req.userId);
    if (!user || user.status !== "active") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    if (!user.privacy) {
      user.privacy = {};
    }
    if (patch.publicDisplayName !== undefined) {
      user.privacy.publicDisplayName = patch.publicDisplayName;
    }
    if (patch.emailVisibility !== undefined) {
      user.privacy.emailVisibility = patch.emailVisibility;
    }
    if (patch.phoneVisibility !== undefined) {
      user.privacy.phoneVisibility = patch.phoneVisibility;
    }

    await user.save();

    return res.json({
      ok: true,
      message: "Privacy settings updated.",
      privacy: normalizePrivacy(user.privacy),
      user: user.toPublicJSON(),
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

/**
 * DELETE /api/v1/users/:id
 *
 * Soft-deletes the user (`status: "deleted"`), revokes all sessions,
 * and clears the session cookie when the caller deletes their own account.
 */
export async function removeUser(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    if (String(req.userId) !== String(id)) {
      return res.status(403).json({
        ok: false,
        code: "NOT_OWNER",
        message: "You can only delete your own account.",
      });
    }

    const user = await User.findById(id);
    if (!user || user.status === "deleted") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    const profileImageUrl = user.profileImageUrl;
    user.status = "deleted";
    await user.save();

    await destroyAllSessionsForUser(user._id);
    if (req.session) await destroySession(req.session._id);
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });

    if (profileImageUrl) {
      discardProfileImage(profileImageUrl);
    }

    return res.json({ ok: true, message: "Account deleted." });
  } catch (err) {
    return next(err);
  }
}
