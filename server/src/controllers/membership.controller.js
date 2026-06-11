import mongoose from "mongoose";
import MembershipOrder from "../models/MembershipOrder.js";
import {
  MEMBERSHIP_PLANS,
  isValidPlan,
  isPaidPlan,
  getPlanPriceBdt,
} from "../config/membership.js";

const MAX_TEXT_LEN = 120;
const MAX_NOTE_LEN = 500;

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * GET /api/v1/membership/plans
 *
 * Public catalog of plans (key, label, price, listing cap). Drives the
 * membership plans page and checkout summary.
 */
export function listPlans(_req, res) {
  return res.json({
    ok: true,
    plans: Object.values(MEMBERSHIP_PLANS),
  });
}

/**
 * POST /api/v1/membership/orders
 *
 * Records a pending direct-bank-transfer purchase request for a paid plan.
 * Does NOT change `users.membership` — activation happens out-of-band.
 */
export async function createOrder(req, res, next) {
  try {
    const body = req.body ?? {};
    const errors = {};

    const plan = asString(body.plan);
    if (!plan) {
      errors.plan = "Plan is required";
    } else if (!isValidPlan(plan)) {
      errors.plan = "Unknown plan";
    } else if (!isPaidPlan(plan)) {
      errors.plan = "Only paid plans can be purchased";
    }

    const bt = body.bankTransfer ?? {};
    const accountName = asString(bt.accountName).slice(0, MAX_TEXT_LEN);
    const senderReference = asString(bt.senderReference).slice(0, MAX_TEXT_LEN);
    const note = asString(bt.note).slice(0, MAX_NOTE_LEN);

    let transferDate = null;
    if (bt.transferDate) {
      const d = new Date(bt.transferDate);
      if (Number.isNaN(d.getTime())) {
        errors.transferDate = "Invalid transfer date";
      } else {
        transferDate = d;
      }
    }

    if (!accountName) {
      errors.accountName = "Account / sender name is required";
    }
    if (!senderReference) {
      errors.senderReference = "Transaction reference is required";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    const order = await MembershipOrder.create({
      userId: req.userId,
      plan,
      amountBdt: getPlanPriceBdt(plan),
      paymentMethod: "bank_transfer",
      bankTransfer: { accountName, senderReference, transferDate, note },
      status: "pending",
    });

    return res.status(201).json({
      ok: true,
      message: "Purchase request received.",
      order: order.toPublicJSON(),
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      const fieldErrors = {};
      for (const [field, detail] of Object.entries(err.errors)) {
        fieldErrors[field] = detail.message;
      }
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors: fieldErrors,
      });
    }
    return next(err);
  }
}

/**
 * GET /api/v1/membership/orders
 *
 * Current user's purchase requests, newest first. Powers the pending-order
 * banner on the profile membership card.
 */
export async function listMyOrders(req, res, next) {
  try {
    const orders = await MembershipOrder.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    return res.json({
      ok: true,
      orders: orders.map((o) => o.toPublicJSON()),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/membership/orders/:id
 *
 * Single order for the receipt page. Owner-scoped.
 */
export async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "ORDER_NOT_FOUND",
        message: "Order not found.",
      });
    }
    const order = await MembershipOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        ok: false,
        code: "ORDER_NOT_FOUND",
        message: "Order not found.",
      });
    }
    if (String(order.userId) !== String(req.userId)) {
      return res.status(403).json({
        ok: false,
        code: "NOT_OWNER",
        message: "You can only view your own orders.",
      });
    }
    return res.json({ ok: true, order: order.toPublicJSON() });
  } catch (err) {
    return next(err);
  }
}
