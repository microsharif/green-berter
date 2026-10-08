import { Router } from "express";
import {
  loadAdminSession,
  requireAdmin,
} from "../../middleware/adminSession.js";
import authRoutes from "./auth.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import userRoutes from "./user.routes.js";
import listingRoutes from "./listing.routes.js";
import catalogRoutes from "./catalog.routes.js";

const router = Router();

// Public admin auth (login). `me` / `logout` apply their own session loaders.
router.use("/auth", authRoutes);

// Everything below requires an authenticated, active admin. Per-route
// permission checks are layered on inside each sub-router.
router.use(loadAdminSession, requireAdmin);
router.use("/analytics", analyticsRoutes);
router.use("/users", userRoutes);
router.use("/listings", listingRoutes);
router.use("/", catalogRoutes);

export default router;
