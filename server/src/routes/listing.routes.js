import { Router } from "express";
import {
  createListing,
  getListing,
  getRelatedListingsByPrice,
  getRelatedListingsByCategory,
  listListings,
  updateListing,
  removeListing,
} from "../controllers/listing.controller.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

/**
 * Public reads — browse page + product detail. No auth required so anonymous
 * visitors can still explore the marketplace.
 */
router.get("/", loadSession, listListings);
router.get("/related-by-price", loadSession, getRelatedListingsByPrice);
router.get("/related-by-category", loadSession, getRelatedListingsByCategory);
router.get("/:id", loadSession, getListing);

/**
 * Create — the destination of DFD §2 step 4 ("Persist & redirect"). The
 * /upload route is protected client-side and the API enforces it again via
 * `requireAuth` so the listing always has a valid `ownerUserId`.
 */
router.post("/", loadSession, requireAuth, createListing);

/**
 * Owner-only edit / delete. Both check `req.userId === listing.ownerUserId`
 * inside the controller; the middleware here just guarantees a logged-in
 * user before we touch the document.
 */
router.patch("/:id", loadSession, requireAuth, updateListing);
router.delete("/:id", loadSession, requireAuth, removeListing);

export default router;
