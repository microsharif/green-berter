import crypto from "node:crypto";
import mongoose from "mongoose";

/**
 * Opaque (non-guessable) identifier stored in the admin session cookie.
 * 32 bytes of CSPRNG → 64 hex chars. Separate collection + cookie from the
 * end-user `sessions` so the two auth systems never collide.
 */
function generateOpaqueId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

const adminSessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => generateOpaqueId(32),
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    csrfToken: {
      type: String,
      required: true,
      default: () => generateOpaqueId(24),
    },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index: MongoDB removes the document when `expiresAt` is reached.
      index: { expires: 0 },
    },
    lastActivityAt: { type: Date, default: () => new Date() },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false, _id: false }
);

adminSessionSchema.method("toPublicJSON", function toPublicJSON() {
  return {
    id: this._id,
    adminId: String(this.adminId),
    csrfToken: this.csrfToken,
    expiresAt: this.expiresAt,
    lastActivityAt: this.lastActivityAt,
    createdAt: this.createdAt,
  };
});

const AdminSession = mongoose.model(
  "AdminSession",
  adminSessionSchema,
  "admin_sessions"
);
export default AdminSession;
