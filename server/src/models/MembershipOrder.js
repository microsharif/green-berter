import mongoose from "mongoose";
import { MEMBERSHIP_PLAN_KEYS } from "../config/membership.js";

/**
 * A user's request to purchase a paid membership plan via direct bank
 * transfer. Orders are created as `pending` — there is no payment gateway or
 * admin approval UI yet, so activation (flipping `users.membership.plan`) is
 * performed later out-of-band (DB / script). The receipt page reads a single
 * order by id.
 */
export const MEMBERSHIP_ORDER_STATUSES = Object.freeze([
  "pending",
  "confirmed",
  "rejected",
]);

const ObjectId = mongoose.Schema.Types.ObjectId;

const bankTransferSchema = new mongoose.Schema(
  {
    accountName: { type: String, trim: true, default: "", maxlength: 120 },
    senderReference: { type: String, trim: true, default: "", maxlength: 120 },
    transferDate: { type: Date, default: null },
    note: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { _id: false }
);

const membershipOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: MEMBERSHIP_PLAN_KEYS,
      required: true,
    },
    amountBdt: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer"],
      default: "bank_transfer",
    },
    bankTransfer: { type: bankTransferSchema, default: () => ({}) },
    status: {
      type: String,
      enum: MEMBERSHIP_ORDER_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

membershipOrderSchema.index({ userId: 1, createdAt: -1 });

membershipOrderSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = String(obj._id);
  delete obj._id;
  obj.userId = String(obj.userId);
  return obj;
});

const MembershipOrder = mongoose.model(
  "MembershipOrder",
  membershipOrderSchema,
  "membership_orders"
);

export default MembershipOrder;
