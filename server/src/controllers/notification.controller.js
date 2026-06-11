import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/**
 * GET /api/v1/notifications/unread-count
 */
export async function getUnreadCount(req, res, next) {
  try {
    const count = await Notification.countDocuments({
      userId: req.userId,
      read: false,
    });
    return res.json({ ok: true, unreadCount: count });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/notifications
 * Query: limit (default 30), offset, unreadOnly (true|false)
 */
export async function listNotifications(req, res, next) {
  try {
    const query = { userId: req.userId };
    if (req.query.unreadOnly === "true") {
      query.read = false;
    }

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 30)
    );
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);

    const [items, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      Notification.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      notifications: items.map((n) => n.toPublicJSON()),
      total,
      limit,
      offset,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 */
export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found.",
      });
    }

    const row = await Notification.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!row) {
      return res.status(404).json({
        ok: false,
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found.",
      });
    }

    return res.json({
      ok: true,
      notification: row.toPublicJSON(),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 */
export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true, readAt: new Date() }
    );

    return res.json({
      ok: true,
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch (err) {
    return next(err);
  }
}
