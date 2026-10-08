import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {
  ADMIN_ROLES,
  DEFAULT_ADMIN_ROLE,
  permissionsForRole,
} from "../config/rbac.js";

const BCRYPT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Administrator account — completely separate from the end-user `users`
 * collection. Authenticated through a dedicated login + `admin_sessions`
 * cookie, never the public auth flow.
 */
const adminSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: ADMIN_ROLES,
      default: DEFAULT_ADMIN_ROLE,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

adminSchema
  .virtual("password")
  .set(function setPassword(plain) {
    this._password = plain;
  });

adminSchema.pre("validate", async function hashPasswordBeforeValidate() {
  if (!this._password) return;
  this.passwordHash = await bcrypt.hash(this._password, BCRYPT_ROUNDS);
  this._password = undefined;
});

adminSchema.method("verifyPassword", async function verifyPassword(plain) {
  if (!plain || !this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
});

/**
 * Safe shape returned to the admin client — strips the hash and embeds the
 * resolved permission list so the frontend can gate UI without a second call.
 */
adminSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  obj.id = String(obj._id);
  delete obj._id;
  obj.permissions = permissionsForRole(this.role);
  return obj;
});

const Admin = mongoose.model("Admin", adminSchema, "admins");
export default Admin;
