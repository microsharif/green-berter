import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Otp, { generateOtpCode } from "../models/Otp.js";
import {
  issueSession,
  destroySession,
  destroyAllSessionsForUser,
} from "../services/session.service.js";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
} from "../config/session.js";
import { UPLOAD_KINDS, isOwnedUploadUrl } from "../config/upload.js";
import { deleteStoredImage } from "../services/imageStorage.service.js";
import {
  sendPasswordResetOtp,
  sendEmailVerificationLink,
} from "../services/mail.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// --- Password reset (OTP) tuning ---
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // min gap between code emails
const OTP_MAX_ATTEMPTS = 5;
const OTP_CODE_DIGITS = 6;

// --- Email verification (link) tuning ---
const EMAIL_VERIFY_TTL_HOURS = 24;
const EMAIL_VERIFY_RESEND_COOLDOWN_MS = 60 * 1000;

const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")[0]
  .trim();

function validateRegistration(payload) {
  const errors = {};
  const fullName = (payload.fullName ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const phone = (payload.phone ?? "").trim();
  const address = (payload.address ?? "").trim();
  const password = payload.password ?? "";

  // `profileImageUrl` is optional. When present it MUST be a value we minted
  // ourselves from POST /api/v1/upload/profile-image — we never trust an
  // arbitrary URL to land in the User document.
  const rawProfileImageUrl =
    typeof payload.profileImageUrl === "string"
      ? payload.profileImageUrl.trim()
      : "";
  let profileImageUrl = "";
  if (rawProfileImageUrl) {
    if (isOwnedUploadUrl(rawProfileImageUrl, UPLOAD_KINDS.PROFILE)) {
      profileImageUrl = rawProfileImageUrl;
    } else {
      errors.profileImageUrl = "Invalid profile image reference.";
    }
  }

  if (!fullName) errors.fullName = "Full name is required";
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email address";
  if (!phone) errors.phone = "Phone is required";
  if (!address) errors.address = "Address is required";
  if (!password) errors.password = "Password is required";
  else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return {
    errors,
    cleaned: { fullName, email, phone, address, password, profileImageUrl },
  };
}

/**
 * Removes an uploaded profile image from disk when registration aborts
 * (validation error, duplicate email, etc.) so we don't accumulate orphans.
 * Swallows IO errors — cleanup is best-effort.
 */
async function discardProfileImage(url) {
  if (!url) return;
  try {
    await deleteStoredImage(url);
  } catch {
    /* ignore — orphan files can be reaped by a future cleanup job */
  }
}

/**
 * POST /api/v1/auth/register
 *
 * DFD §1 Registration → Application database:
 *   - receive registration form (name, email, phone, address, password)
 *   - INSERT user record into D2 (Users collection)
 *
 * Session creation (D1) is handled by the session module and is NOT done here.
 */
export async function register(req, res, next) {
  const { errors, cleaned } = validateRegistration(req.body ?? {});
  if (Object.keys(errors).length > 0) {
    await discardProfileImage(cleaned.profileImageUrl);
    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields.",
      errors,
    });
  }

  try {
    const existing = await User.findOne({ email: cleaned.email })
      .select("_id")
      .lean();
    if (existing) {
      await discardProfileImage(cleaned.profileImageUrl);
      return res.status(409).json({
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
      });
    }

    const user = new User({
      fullName: cleaned.fullName,
      email: cleaned.email,
      phone: cleaned.phone,
      address: cleaned.address,
      profileImageUrl: cleaned.profileImageUrl,
    });
    user.password = cleaned.password;
    await user.save();

    return res.status(201).json({
      ok: true,
      message: "Registration successful.",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.email) {
      await discardProfileImage(cleaned.profileImageUrl);
      return res.status(409).json({
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
      });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      await discardProfileImage(cleaned.profileImageUrl);
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
    await discardProfileImage(cleaned.profileImageUrl);
    return next(err);
  }
}

function validateLogin(payload) {
  const errors = {};
  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";

  if (!email) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Invalid email address";
  if (!password) errors.password = "Password is required";

  return { errors, cleaned: { email, password } };
}

/**
 * POST /api/v1/auth/login
 *
 * DFD §2 Login:
 *   - read user; verify credentials → D2
 *   - create server session                   → D1
 *   - issue httpOnly + SameSite cookie back to the user
 *
 * Per ApplicationFeatureRequirements §1.2 the response distinguishes
 * "unregistered email" from "incorrect password" so the UI can show clear
 * feedback.
 */
export async function login(req, res, next) {
  try {
    const { errors, cleaned } = validateLogin(req.body ?? {});
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    const user = await User.findOne({ email: cleaned.email }).select(
      "+passwordHash"
    );
    if (!user) {
      return res.status(404).json({
        ok: false,
        code: "EMAIL_NOT_REGISTERED",
        message: "No account is registered with this email.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        ok: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "This account is disabled. Please contact support.",
      });
    }

    const passwordOk = await user.verifyPassword(cleaned.password);
    if (!passwordOk) {
      return res.status(401).json({
        ok: false,
        code: "WRONG_PASSWORD",
        message: "Incorrect password. Please try again.",
      });
    }

    const session = await issueSession({
      userId: user._id,
      userAgent: req.get("user-agent") ?? "",
      ipAddress: req.ip ?? "",
    });

    user.lastLoginAt = new Date();
    await user.save();

    res.cookie(
      SESSION_COOKIE_NAME,
      session._id,
      buildSessionCookieOptions(session.expiresAt)
    );

    return res.json({
      ok: true,
      message: "Login successful.",
      user: user.toPublicJSON(),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/me
 *
 * DFD §3 Session & protected routes:
 *   "Session restored from cookie; guards routes and handles logout."
 *
 * Returns the currently authenticated user based on the session cookie.
 */
export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.status !== "active") {
      if (req.session) await destroySession(req.session._id);
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(401).json({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Your session is no longer valid.",
      });
    }
    return res.json({
      ok: true,
      user: user.toPublicJSON(),
      csrfToken: req.session.csrfToken,
      expiresAt: req.session.expiresAt,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 *
 * Destroys the server-side session (if any) and clears the cookie.
 * Idempotent — safe to call when already signed out.
 */
export async function logout(req, res, next) {
  try {
    if (req.session) await destroySession(req.session._id);
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return res.json({ ok: true, message: "Logged out." });
  } catch (err) {
    return next(err);
  }
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * POST /api/v1/auth/forgot-password
 *
 * DFD §1.4 Forgot password (OTP):
 *   - look up user by registered email          → D2
 *   - issue + store a hashed one-time code       → D2 (otps)
 *   - deliver the code over email                → Email provider
 *
 * The verification code is always sent to the account **email** (never SMS).
 * Re-requesting reuses a short cooldown to curb abuse.
 */
export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please enter a valid email address.",
        errors: { email: "Invalid email address" },
      });
    }

    const user = await User.findOne({ email }).select("_id fullName status");
    if (!user || user.status !== "active") {
      return res.status(404).json({
        ok: false,
        code: "EMAIL_NOT_REGISTERED",
        message: "No active account is registered with this email.",
      });
    }

    // Cooldown: avoid re-sending a code if one was just issued.
    const recent = await Otp.findOne({
      userId: user._id,
      purpose: "password_reset",
      consumedAt: null,
    }).sort({ createdAt: -1 });

    if (
      recent &&
      Date.now() - new Date(recent.createdAt).getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      const retryInSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS -
          (Date.now() - new Date(recent.createdAt).getTime())) /
          1000
      );
      return res.status(429).json({
        ok: false,
        code: "OTP_RESEND_TOO_SOON",
        message: `Please wait ${retryInSeconds}s before requesting another code.`,
        retryInSeconds,
      });
    }

    // Invalidate any prior outstanding reset codes for this user.
    await Otp.deleteMany({ userId: user._id, purpose: "password_reset" });

    const code = generateOtpCode(OTP_CODE_DIGITS);
    const otp = new Otp({
      userId: user._id,
      email,
      purpose: "password_reset",
      channel: "email",
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      maxAttempts: OTP_MAX_ATTEMPTS,
      ipAddress: req.ip ?? "",
    });
    await otp.setCode(code);
    await otp.save();

    try {
      await sendPasswordResetOtp({
        to: email,
        code,
        fullName: user.fullName,
        expiresInMinutes: OTP_TTL_MINUTES,
      });
    } catch (err) {
      // Roll back the stored code so a failed send doesn't strand the user.
      await Otp.deleteOne({ _id: otp._id });
      if (err?.code === "EMAIL_NOT_CONFIGURED") {
        return res.status(503).json({
          ok: false,
          code: "EMAIL_NOT_CONFIGURED",
          message:
            "Email delivery is not configured. Please contact support.",
        });
      }
      // Any other SMTP / network failure (ESOCKET, ETIMEDOUT, EAUTH, …) is a
      // server-side delivery problem — log the detail for ops, but never leak
      // the raw socket error / IP to the client.
      console.error(
        "Failed to send password reset OTP:",
        err?.code ?? "",
        err?.message ?? err
      );
      return res.status(502).json({
        ok: false,
        code: "EMAIL_SEND_FAILED",
        message:
          "We couldn't send the verification email right now. Please try again in a few minutes.",
      });
    }

    return res.json({
      ok: true,
      message: `We've emailed a ${OTP_CODE_DIGITS}-digit verification code to ${email}.`,
      expiresInMinutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/verify-reset-otp
 *
 * DFD §1.4: verify the one-time code (expiry + retry count). On success we
 * mint a short-lived `resetToken` the client exchanges on the reset step, so
 * the raw code is never resubmitted.
 */
export async function verifyResetOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code ?? "").trim();

    if (!email || !code) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Email and verification code are required.",
        errors: {
          ...(email ? null : { email: "Email is required" }),
          ...(code ? null : { code: "Verification code is required" }),
        },
      });
    }

    const user = await User.findOne({ email }).select("_id status");
    if (!user || user.status !== "active") {
      return res.status(400).json({
        ok: false,
        code: "OTP_INVALID",
        message: "Invalid or expired verification code.",
      });
    }

    const otp = await Otp.findOne({
      userId: user._id,
      purpose: "password_reset",
      consumedAt: null,
    })
      .select("+codeHash")
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({
        ok: false,
        code: "OTP_EXPIRED",
        message: "This code has expired. Please request a new one.",
      });
    }

    if (otp.attempts >= otp.maxAttempts) {
      await Otp.deleteOne({ _id: otp._id });
      return res.status(429).json({
        ok: false,
        code: "OTP_MAX_ATTEMPTS",
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    const matches = await otp.verifyCode(code);
    if (!matches) {
      otp.attempts += 1;
      await otp.save();
      const remaining = Math.max(0, otp.maxAttempts - otp.attempts);
      return res.status(400).json({
        ok: false,
        code: "OTP_INVALID",
        message:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Incorrect code. Please request a new one.",
        attemptsRemaining: remaining,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    otp.verifiedAt = new Date();
    otp.resetToken = resetToken;
    await otp.save();

    return res.json({
      ok: true,
      message: "Code verified. You can now set a new password.",
      resetToken,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/reset-password
 *
 * DFD §1.5 Reset password: exchange a verified `resetToken` for a new
 * password. Updates the bcrypt hash and revokes every existing session so a
 * compromised session can't outlive the reset.
 */
export async function resetPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const resetToken = String(req.body?.resetToken ?? "").trim();
    const password = String(req.body?.password ?? "");

    const errors = {};
    if (!email) errors.email = "Email is required";
    if (!resetToken) errors.resetToken = "Reset token is required";
    if (!password) errors.password = "Password is required";
    else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    const user = await User.findOne({ email }).select("_id status");
    if (!user || user.status !== "active") {
      return res.status(400).json({
        ok: false,
        code: "RESET_TOKEN_INVALID",
        message: "This reset request is invalid or has expired.",
      });
    }

    const otp = await Otp.findOne({
      userId: user._id,
      purpose: "password_reset",
      resetToken,
      consumedAt: null,
    }).select("+resetToken");

    if (!otp || !otp.verifiedAt || otp.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({
        ok: false,
        code: "RESET_TOKEN_INVALID",
        message: "This reset request is invalid or has expired.",
      });
    }

    // Load the full user document so the password virtual re-hashes on save.
    const fullUser = await User.findById(user._id).select("+passwordHash");
    fullUser.password = password;
    await fullUser.save();

    // Consume the code and remove any sibling reset codes.
    await Otp.deleteMany({ userId: user._id, purpose: "password_reset" });

    // Security: invalidate all existing sessions after a password reset.
    await destroyAllSessionsForUser(user._id);

    return res.json({
      ok: true,
      message: "Your password has been reset. Please sign in.",
    });
  } catch (err) {
    return next(err);
  }
}

function hashEmailVerifyToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST /api/v1/auth/send-verification-email
 *
 * Authenticated user requests a one-click verification link delivered to
 * their account email. Reuses the otps collection with purpose `email_verify`.
 */
export async function sendVerificationEmail(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.status !== "active") {
      return res.status(401).json({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Your session is no longer valid.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        ok: false,
        code: "EMAIL_ALREADY_VERIFIED",
        message: "This email address is already verified.",
      });
    }

    const recent = await Otp.findOne({
      userId: user._id,
      purpose: "email_verify",
      consumedAt: null,
    }).sort({ createdAt: -1 });

    if (
      recent &&
      Date.now() - new Date(recent.createdAt).getTime() <
        EMAIL_VERIFY_RESEND_COOLDOWN_MS
    ) {
      const retryInSeconds = Math.ceil(
        (EMAIL_VERIFY_RESEND_COOLDOWN_MS -
          (Date.now() - new Date(recent.createdAt).getTime())) /
          1000
      );
      return res.status(429).json({
        ok: false,
        code: "EMAIL_VERIFY_RESEND_TOO_SOON",
        message: `Please wait ${retryInSeconds}s before requesting another link.`,
        retryInSeconds,
      });
    }

    await Otp.deleteMany({ userId: user._id, purpose: "email_verify" });

    const token = crypto.randomBytes(32).toString("hex");
    const otp = new Otp({
      userId: user._id,
      email: user.email,
      purpose: "email_verify",
      channel: "email",
      expiresAt: new Date(
        Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000
      ),
      maxAttempts: 1,
      resetToken: hashEmailVerifyToken(token),
      ipAddress: req.ip ?? "",
    });
    await otp.setCode(token);
    await otp.save();

    const verifyUrl = `${CLIENT_ORIGIN}/verify-email?token=${token}`;

    try {
      await sendEmailVerificationLink({
        to: user.email,
        fullName: user.fullName,
        verifyUrl,
        expiresInHours: EMAIL_VERIFY_TTL_HOURS,
      });
    } catch (err) {
      await Otp.deleteOne({ _id: otp._id });
      if (err?.code === "EMAIL_NOT_CONFIGURED") {
        return res.status(503).json({
          ok: false,
          code: "EMAIL_NOT_CONFIGURED",
          message:
            "Email delivery is not configured. Please contact support.",
        });
      }
      console.error(
        "Failed to send email verification link:",
        err?.code ?? "",
        err?.message ?? err
      );
      return res.status(502).json({
        ok: false,
        code: "EMAIL_SEND_FAILED",
        message:
          "We couldn't send the verification email right now. Please try again in a few minutes.",
      });
    }

    return res.json({
      ok: true,
      message: `We've sent a verification link to ${user.email}.`,
      expiresInHours: EMAIL_VERIFY_TTL_HOURS,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/verify-email
 *
 * Exchanges a one-time link token for `emailVerified: true` on the user.
 */
export async function verifyEmail(req, res, next) {
  try {
    const token = String(req.body?.token ?? req.query?.token ?? "").trim();
    if (!token) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Verification token is required.",
      });
    }

    const otp = await Otp.findOne({
      purpose: "email_verify",
      resetToken: hashEmailVerifyToken(token),
      consumedAt: null,
    }).select("+codeHash");

    if (!otp || otp.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({
        ok: false,
        code: "EMAIL_VERIFY_TOKEN_INVALID",
        message: "This verification link is invalid or has expired.",
      });
    }

    const matches = await otp.verifyCode(token);
    if (!matches) {
      return res.status(400).json({
        ok: false,
        code: "EMAIL_VERIFY_TOKEN_INVALID",
        message: "This verification link is invalid or has expired.",
      });
    }

    const user = await User.findById(otp.userId);
    if (!user || user.status !== "active") {
      return res.status(400).json({
        ok: false,
        code: "EMAIL_VERIFY_TOKEN_INVALID",
        message: "This verification link is invalid or has expired.",
      });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    otp.consumedAt = new Date();
    await otp.save();
    await Otp.deleteMany({ userId: user._id, purpose: "email_verify" });

    return res.json({
      ok: true,
      message: "Email is verified.",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    return next(err);
  }
}
