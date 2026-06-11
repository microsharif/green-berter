import crypto from "node:crypto";
import mongoose from "mongoose";

/**
 * Opaque (non-guessable) identifier stored in the session cookie.
 * 32 bytes of CSPRNG → 64 hex chars.
 */
function generateOpaqueId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

const sessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => generateOpaqueId(32),
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

sessionSchema.method("toPublicJSON", function toPublicJSON() {
  return {
    id: this._id,
    userId: String(this.userId),
    csrfToken: this.csrfToken,
    expiresAt: this.expiresAt,
    lastActivityAt: this.lastActivityAt,
    createdAt: this.createdAt,
  };
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
