import mongoose from "mongoose";
import User from "../../models/User.js";
import Listing from "../../models/Listing.js";
import Claim from "../../models/Claim.js";
import AuditLog from "../../models/AuditLog.js";
import { destroyAllSessionsForUser } from "../../services/session.service.js";
import { writeAdminAudit } from "../../utils/adminAudit.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_STATUSES = ["active", "disabled", "suspended", "banned", "deleted"];

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Full user shape for admin consumption — no privacy filtering, but never
 * leaks the password hash (it is `select:false` and not loaded by `.lean()`).
 */
function toAdminUserJSON(doc) {
  return {
    id: String(doc._id),
    fullName: doc.fullName ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    address: doc.address ?? "",
    profileImageUrl: doc.profileImageUrl ?? "",
    emailVerified: Boolean(doc.emailVerified),
    status: doc.status,
    lastLoginAt: doc.lastLoginAt ?? null,
    membership: {
      plan: doc.membership?.plan ?? "free",
      status: doc.membership?.status ?? "active",
      startedAt: doc.membership?.startedAt ?? null,
      expiresAt: doc.membership?.expiresAt ?? null,
    },
    privacy: {
      publicDisplayName: doc.privacy?.publicDisplayName ?? "",
      emailVisibility: doc.privacy?.emailVisibility ?? "hidden",
      phoneVisibility: doc.privacy?.phoneVisibility ?? "hidden",
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/v1/admin/users
 *
 * Lists every user (all statuses). Supports search (name/email), status
 * filter, sort, and pagination.
 */
export async function listUsers(req, res, next) {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    const query = {};
    const status = asString(req.query.status);
    if (status && USER_STATUSES.includes(status)) {
      query.status = status;
    }
    const plan = asString(req.query.plan);
    if (plan) query["membership.plan"] = plan;

    const search = asString(req.query.search);
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      query.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
    }

    const sortField = ["createdAt", "lastLoginAt", "fullName"].includes(
      req.query.sortBy
    )
      ? req.query.sortBy
      : "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ [sortField]: sortDir })
        .skip(offset)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      users: users.map(toAdminUserJSON),
      total,
      limit,
      offset,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/users/:id
 *
 * Single user with listing/claim aggregate counts and recent activity.
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

    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    const objId = new mongoose.Types.ObjectId(id);
    const [
      totalListings,
      activeListings,
      completedListings,
      claimsMade,
      claimsReceived,
      activity,
    ] = await Promise.all([
      Listing.countDocuments({ ownerUserId: objId }),
      Listing.countDocuments({ ownerUserId: objId, status: "available" }),
      Listing.countDocuments({ ownerUserId: objId, status: "completed" }),
      Claim.countDocuments({ claimerUserId: objId }),
      Claim.countDocuments({ ownerUserId: objId }),
      AuditLog.find({ entityType: "user", entityId: objId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return res.json({
      ok: true,
      user: toAdminUserJSON(user),
      stats: {
        totalListings,
        activeListings,
        completedListings,
        claimsMade,
        claimsReceived,
      },
      activity: activity.map((a) => ({
        id: String(a._id),
        action: a.action,
        metadata: a.metadata ?? {},
        previousState: a.previousState ?? null,
        newState: a.newState ?? null,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

const PATCHABLE_FIELDS = new Set(["fullName", "phone", "address", "email"]);

/**
 * PATCH /api/v1/admin/users/:id
 *
 * Edit basic profile fields. Status changes go through the dedicated action
 * endpoint below.
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

    const incoming = req.body ?? {};
    for (const key of Object.keys(incoming)) {
      if (!PATCHABLE_FIELDS.has(key)) {
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

    const user = await User.findById(id);
    if (!user || user.status === "deleted") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    const errors = {};
    const patch = {};
    if (incoming.fullName !== undefined) {
      const fullName = asString(incoming.fullName);
      if (!fullName) errors.fullName = "Full name is required";
      else patch.fullName = fullName;
    }
    if (incoming.phone !== undefined) patch.phone = asString(incoming.phone);
    if (incoming.address !== undefined) {
      patch.address = asString(incoming.address);
    }
    if (incoming.email !== undefined) {
      const email = asString(incoming.email).toLowerCase();
      if (!email) errors.email = "Email is required";
      else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email address";
      else if (email !== user.email) patch.email = email;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
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

    const previous = {
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      email: user.email,
    };

    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.phone !== undefined) user.phone = patch.phone;
    if (patch.address !== undefined) user.address = patch.address;
    if (patch.email !== undefined) user.email = patch.email;
    await user.save();

    await writeAdminAudit(req, {
      entityType: "user",
      entityId: user._id,
      action: "update",
      previousState: previous,
      newState: patch,
    });

    return res.json({
      ok: true,
      message: "User updated.",
      user: toAdminUserJSON(user.toObject()),
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

// Map a requested action to the resulting account status.
const STATUS_ACTIONS = {
  activate: "active",
  deactivate: "disabled",
  suspend: "suspended",
  ban: "banned",
};

/**
 * PATCH /api/v1/admin/users/:id/status
 *
 * Activate / deactivate / suspend / ban a user. Any non-active status revokes
 * all of the user's sessions so the change takes effect immediately.
 */
export async function changeUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
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

    const user = await User.findById(id);
    if (!user || user.status === "deleted") {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    const previousStatus = user.status;
    if (previousStatus === nextStatus) {
      return res.json({
        ok: true,
        message: "No change.",
        user: toAdminUserJSON(user.toObject()),
      });
    }

    user.status = nextStatus;
    await user.save();

    // Force the user out everywhere when they lose access.
    if (nextStatus !== "active") {
      await destroyAllSessionsForUser(user._id);
    }

    await writeAdminAudit(req, {
      entityType: "user",
      entityId: user._id,
      action: "status_change",
      previousState: { status: previousStatus },
      newState: { status: nextStatus },
      metadata: { reason: asString(req.body?.reason) || undefined },
    });

    return res.json({
      ok: true,
      message: `User ${action}d.`,
      user: toAdminUserJSON(user.toObject()),
    });
  } catch (err) {
    return next(err);
  }
}
