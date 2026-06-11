import mongoose from "mongoose";

/**
 * Unified record for DFD §4.1 Give claims and §4.2 Exchange proposals.
 * `type` must align with the parent listing's `listingType`.
 */
export const CLAIM_TYPES = Object.freeze(["give_claim", "exchange_proposal"]);

export const CLAIM_STATUSES = Object.freeze([
  "submitted",
  "pending",
  "accepted",
  "rejected",
  "completed",
  "cancelled",
]);

/** Non-terminal — still competing or awaiting a response. */
export const OPEN_CLAIM_STATUSES = Object.freeze(["submitted", "pending"]);

/** Claims where owner and claimer may exchange negotiation messages. */
export const NEGOTIABLE_CLAIM_STATUSES = Object.freeze([
  "submitted",
  "pending",
  "accepted",
]);

export const TERMINAL_CLAIM_STATUSES = Object.freeze([
  "accepted",
  "rejected",
  "completed",
  "cancelled",
]);

const ObjectId = mongoose.Schema.Types.ObjectId;

const offeredItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    listingId: {
      type: ObjectId,
      ref: "Listing",
      required: [true, "listingId is required"],
      index: true,
    },
    /** Denormalised from `listings.ownerUserId` for owner-inbox queries. */
    ownerUserId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    claimerUserId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: CLAIM_TYPES,
      required: true,
    },
    message: { type: String, trim: true, default: "" },
    offeredItem: { type: offeredItemSchema, default: () => ({}) },
    status: {
      type: String,
      enum: CLAIM_STATUSES,
      default: "submitted",
      index: true,
    },
    ownerDecisionAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

claimSchema.index({ listingId: 1, status: 1, createdAt: -1 });
claimSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });
claimSchema.index({ claimerUserId: 1, status: 1, createdAt: -1 });

/** At most one accepted claim per listing (defense in depth per schema §7). */
claimSchema.index(
  { listingId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "accepted" },
  }
);

claimSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = String(obj._id);
  delete obj._id;
  obj.listingId = String(obj.listingId);
  obj.ownerUserId = String(obj.ownerUserId);
  obj.claimerUserId = String(obj.claimerUserId);
  return obj;
});

const Claim = mongoose.model("Claim", claimSchema, "claims");
export default Claim;
