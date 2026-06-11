import { Router } from "express";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

router.use(loadSession, requireAuth);

router.get("/unread-count", getUnreadCount);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;
