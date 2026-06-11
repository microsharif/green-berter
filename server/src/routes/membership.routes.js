import { Router } from "express";
import {
  listPlans,
  createOrder,
  listMyOrders,
  getOrder,
} from "../controllers/membership.controller.js";
import { loadSession, requireAuth } from "../middleware/session.js";

const router = Router();

/** Public plan catalog for the membership page + checkout summary. */
router.get("/plans", listPlans);

/**
 * Authenticated direct-bank-transfer purchase requests. Orders are recorded
 * as `pending`; the user's plan is not changed here.
 */
router.post("/orders", loadSession, requireAuth, createOrder);
router.get("/orders", loadSession, requireAuth, listMyOrders);
router.get("/orders/:id", loadSession, requireAuth, getOrder);

export default router;
