import { Router } from "express";
import {
  listUsers,
  getUser,
  updateUser,
  changeUserStatus,
} from "../../controllers/admin/user.controller.js";
import { requirePermission } from "../../middleware/adminSession.js";
import { PERMISSIONS } from "../../config/rbac.js";

const router = Router();

router.get("/", requirePermission(PERMISSIONS.USERS_READ), listUsers);
router.get("/:id", requirePermission(PERMISSIONS.USERS_READ), getUser);
router.patch("/:id", requirePermission(PERMISSIONS.USERS_WRITE), updateUser);
router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.USERS_WRITE),
  changeUserStatus
);

export default router;
