import { Router } from "express";
import {
  uploadProfileImage,
  uploadProductImage,
} from "../controllers/upload.controller.js";
import { multerErrorHandler, singleImage } from "../middleware/upload.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

/**
 * Profile image upload — unauthenticated by design so the registration page
 * can call it before the user account exists. Multer enforces size/type/
 * count limits; the controller persists to `<date>/profile/<uuid>.webp`.
 */
router.post(
  "/profile-image",
  singleImage("image"),
  multerErrorHandler,
  uploadProfileImage
);

/**
 * Product image upload — requires a session because product listings are
 * owner-scoped. The route is in place so the listing flow can adopt the
 * same storage tree without revisiting routes/middleware.
 */
router.post(
  "/product-image",
  loadSession,
  requireAuth,
  singleImage("image"),
  multerErrorHandler,
  uploadProductImage
);

export default router;
