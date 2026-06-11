import crypto from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;

/** One-time codes for password reset, email verification, and 2FA (DFD §1.4–§1.5). */
export const OTP_PURPOSES = ["password_reset", "email_verify", "login_2fa"];
export const OTP_CHANNELS = ["email", "sms"];

/** Generate a numeric one-time code (zero-padded to `digits`). */
export function generateOtpCode(digits = 6) {
  const max = 10 ** digits;
  return String(crypto.randomInt(0, max)).padStart(digits, "0");
}

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      required: true,
    },
    channel: {
      type: String,
      enum: OTP_CHANNELS,
      default: "email",
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index: MongoDB removes the document once `expiresAt` passes.
      index: { expires: 0 },
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    resendCount: { type: Number, default: 0 },
    lastResendAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    consumedAt: { type: Date, default: null },
    // Opaque token issued after a successful code verification; the
    // reset-password step exchanges it for the actual password change so the
    // raw code never has to be re-submitted.
    resetToken: {
      type: String,
      default: null,
      select: false,
      index: true,
    },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

otpSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

/** Hash and store a plaintext code on this document. */
otpSchema.method("setCode", async function setCode(plainCode) {
  this.codeHash = await bcrypt.hash(String(plainCode), BCRYPT_ROUNDS);
});

/** Compare a submitted plaintext code against the stored hash. */
otpSchema.method("verifyCode", async function verifyCode(plainCode) {
  if (!plainCode || !this.codeHash) return false;
  return bcrypt.compare(String(plainCode), this.codeHash);
});

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
