import mongoose from "mongoose";

export const AUDIT_ENTITY_TYPES = Object.freeze([
  "user",
  "session",
  "otp",
  "listing_category",
  "listing_location",
  "listing",
  "claim",
]);

const ObjectId = mongoose.Schema.Types.ObjectId;

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: ObjectId,
      required: true,
    },
    action: { type: String, required: true, trim: true },
    actorUserId: { type: ObjectId, ref: "User", default: null },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    previousState: { type: mongoose.Schema.Types.Mixed, default: null },
    newState: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema, "audit_logs");
export default AuditLog;
