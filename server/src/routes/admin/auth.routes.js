import { Router } from "express";
import {
  login,
  getMe,
  logout,
} from "../../controllers/admin/auth.controller.js";
import {
  loadAdminSession,
  requireAdmin,
} from "../../middleware/adminSession.js";

const router = Router();

router.post("/login", login);
router.get("/me", loadAdminSession, requireAdmin, getMe);
router.post("/logout", loadAdminSession, logout);

export default router;
