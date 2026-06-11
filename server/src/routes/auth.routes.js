import { Router } from "express";
import {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", loadSession, requireAuth, getMe);
router.post("/logout", loadSession, logout);

// Forgot-password (OTP) flow — DFD §1.4–§1.5. Code is delivered via email.
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

export default router;
