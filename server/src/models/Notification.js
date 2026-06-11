import mongoose from "mongoose";

export const NOTIFICATION_TYPES = Object.freeze([
  "claim_submitted",
  "claim_accepted",
  "claim_rejected",
  "claim_message",
  "claim_completed",
  "listing_updated",
]);

export const NOTIFICATION_CHANNELS = Object.freeze(["in_app", "email", "push"]);

const ObjectId = mongoose.Schema.Types.ObjectId;

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    relatedListingId: { type: ObjectId, ref: "Listing", default: null },
    relatedClaimId: { type: ObjectId, ref: "Claim", default: null },
    /** Deep-link query string, e.g. ?claims=owner&negotiate=<claimId> */
    navigateSearch: { type: String, trim: true, default: "" },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      default: "in_app",
    },
    deliveredAt: { type: Date, default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ relatedClaimId: 1 });

notificationSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = String(obj._id);
  delete obj._id;
  obj.userId = String(obj.userId);
  if (obj.relatedListingId) obj.relatedListingId = String(obj.relatedListingId);
  if (obj.relatedClaimId) obj.relatedClaimId = String(obj.relatedClaimId);
  if (obj.navigateSearch) obj.navigateSearch = String(obj.navigateSearch);
  return obj;
});

const Notification = mongoose.model(
  "Notification",
  notificationSchema,
  "notifications"
);
export default Notification;
