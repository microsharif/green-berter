import { Router } from "express";
import {
  getOverview,
  getGrowth,
  getRecent,
} from "../../controllers/admin/analytics.controller.js";
import { requirePermission } from "../../middleware/adminSession.js";
import { PERMISSIONS } from "../../config/rbac.js";

const router = Router();

router.get("/overview", requirePermission(PERMISSIONS.ANALYTICS_READ), getOverview);
router.get("/growth", requirePermission(PERMISSIONS.ANALYTICS_READ), getGrowth);
router.get("/recent", requirePermission(PERMISSIONS.ANALYTICS_READ), getRecent);

export default router;
