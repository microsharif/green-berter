import { Router } from "express";
import {
  listListings,
  getListing,
  updateListing,
  changeListingStatus,
  removeListing,
} from "../../controllers/admin/listing.controller.js";
import { requirePermission } from "../../middleware/adminSession.js";
import { PERMISSIONS } from "../../config/rbac.js";

const router = Router();

router.get("/", requirePermission(PERMISSIONS.LISTINGS_READ), listListings);
router.get("/:id", requirePermission(PERMISSIONS.LISTINGS_READ), getListing);
router.patch("/:id", requirePermission(PERMISSIONS.LISTINGS_WRITE), updateListing);
router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.LISTINGS_WRITE),
  changeListingStatus
);
router.delete("/:id", requirePermission(PERMISSIONS.LISTINGS_WRITE), removeListing);

export default router;
