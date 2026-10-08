import { Router } from "express";
import {
  listCategories,
  createCategory,
  updateCategory,
  listLocations,
  createLocation,
  updateLocation,
} from "../../controllers/admin/catalog.controller.js";
import { requirePermission } from "../../middleware/adminSession.js";
import { PERMISSIONS } from "../../config/rbac.js";

const router = Router();

// Categories
router.get(
  "/categories",
  requirePermission(PERMISSIONS.CATALOG_READ),
  listCategories
);
router.post(
  "/categories",
  requirePermission(PERMISSIONS.CATALOG_WRITE),
  createCategory
);
router.patch(
  "/categories/:id",
  requirePermission(PERMISSIONS.CATALOG_WRITE),
  updateCategory
);

// Locations
router.get(
  "/locations",
  requirePermission(PERMISSIONS.CATALOG_READ),
  listLocations
);
router.post(
  "/locations",
  requirePermission(PERMISSIONS.CATALOG_WRITE),
  createLocation
);
router.patch(
  "/locations/:id",
  requirePermission(PERMISSIONS.CATALOG_WRITE),
  updateLocation
);

export default router;
