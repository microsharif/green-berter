import Admin from "../../models/Admin.js";
import {
  issueAdminSession,
  destroyAdminSession,
} from "../../services/adminSession.service.js";
import {
  ADMIN_SESSION_COOKIE_NAME,
  buildAdminSessionCookieOptions,
} from "../../config/adminSession.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * POST /api/v1/admin/auth/login
 *
 * Dedicated administrator login. Verifies credentials against the `admins`
 * collection, creates an `admin_sessions` row, and issues the separate
 * admin session cookie.
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

    const admin = await Admin.findOne({ email: cleaned.email }).select(
      "+passwordHash"
    );
    if (!admin) {
      return res.status(404).json({
        ok: false,
        code: "EMAIL_NOT_REGISTERED",
        message: "No administrator is registered with this email.",
      });
    }

    if (admin.status !== "active") {
      return res.status(403).json({
        ok: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "This admin account is disabled. Contact a super admin.",
      });
    }

    const passwordOk = await admin.verifyPassword(cleaned.password);
    if (!passwordOk) {
      return res.status(401).json({
        ok: false,
        code: "WRONG_PASSWORD",
        message: "Incorrect password. Please try again.",
      });
    }

    const session = await issueAdminSession({
      adminId: admin._id,
      userAgent: req.get("user-agent") ?? "",
      ipAddress: req.ip ?? "",
    });

    admin.lastLoginAt = new Date();
    await admin.save();

    res.cookie(
      ADMIN_SESSION_COOKIE_NAME,
      session._id,
      buildAdminSessionCookieOptions(session.expiresAt)
    );

    return res.json({
      ok: true,
      message: "Login successful.",
      admin: admin.toPublicJSON(),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/auth/me
 *
 * Restores the current admin from the session cookie.
 */
export async function getMe(req, res) {
  return res.json({
    ok: true,
    admin: req.admin.toPublicJSON(),
    csrfToken: req.adminSession.csrfToken,
    expiresAt: req.adminSession.expiresAt,
  });
}

/**
 * POST /api/v1/admin/auth/logout
 *
 * Destroys the admin session (if any) and clears the cookie. Idempotent.
 */
export async function logout(req, res, next) {
  try {
    if (req.adminSession) await destroyAdminSession(req.adminSession._id);
    res.clearCookie(ADMIN_SESSION_COOKIE_NAME, { path: "/" });
    return res.json({ ok: true, message: "Logged out." });
  } catch (err) {
    return next(err);
  }
}
