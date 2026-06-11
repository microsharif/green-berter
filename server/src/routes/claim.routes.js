import { Router } from "express";
import {
  createClaim,
  getClaim,
  getClaimMessages,
  listClaims,
  postClaimMessage,
  updateClaim,
} from "../controllers/claim.controller.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

/**
 * DFD §4 — all claim/exchange flows require authentication (§4.5).
 */
router.use(loadSession, requireAuth);

router.post("/", createClaim);
router.get("/", listClaims);
router.get("/:id/messages", getClaimMessages);
router.post("/:id/messages", postClaimMessage);
router.get("/:id", getClaim);
router.patch("/:id", updateClaim);

export default router;
