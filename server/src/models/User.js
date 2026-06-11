import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { VISIBILITY_LEVELS } from "../utils/userPrivacy.js";
import {
  MEMBERSHIP_PLAN_KEYS,
  MEMBERSHIP_STATUSES,
  DEFAULT_MEMBERSHIP_PLAN,
} from "../config/membership.js";

const BCRYPT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Invalid email address"],
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 32,
    },
    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    profileImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "disabled", "deleted"],
      default: "active",
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    privacy: {
      publicDisplayName: {
        type: String,
        trim: true,
        default: "",
        maxlength: 60,
      },
      emailVisibility: {
        type: String,
        enum: VISIBILITY_LEVELS,
        default: "hidden",
      },
      phoneVisibility: {
        type: String,
        enum: VISIBILITY_LEVELS,
        default: "hidden",
      },
    },
    membership: {
      plan: {
        type: String,
        enum: MEMBERSHIP_PLAN_KEYS,
        default: DEFAULT_MEMBERSHIP_PLAN,
      },
      status: {
        type: String,
        enum: MEMBERSHIP_STATUSES,
        default: "active",
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

/**
 * Virtual `password` accepts a plaintext value and hashes it into
 * `passwordHash` on save. The plaintext is never persisted.
 */
userSchema
  .virtual("password")
  .set(function setPassword(plain) {
    this._password = plain;
  });

userSchema.pre("validate", async function hashPasswordBeforeValidate() {
  if (!this._password) return;
  this.passwordHash = await bcrypt.hash(this._password, BCRYPT_ROUNDS);
  this._password = undefined;
});

userSchema.method("verifyPassword", async function verifyPassword(plain) {
  if (!plain || !this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
});

/**
 * Safe shape returned to API consumers — strips secrets and Mongo internals.
 */
userSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  if (obj.privacy) {
    obj.privacy = {
      publicDisplayName: obj.privacy.publicDisplayName ?? "",
      emailVisibility: obj.privacy.emailVisibility ?? "hidden",
      phoneVisibility: obj.privacy.phoneVisibility ?? "hidden",
    };
  }
  obj.membership = {
    plan: obj.membership?.plan ?? DEFAULT_MEMBERSHIP_PLAN,
    status: obj.membership?.status ?? "active",
    startedAt: obj.membership?.startedAt ?? null,
    expiresAt: obj.membership?.expiresAt ?? null,
  };
  return obj;
});

const User = mongoose.model("User", userSchema);
export default User;
