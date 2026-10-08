import Admin from "../models/Admin.js";
import { findActiveAdminSession } from "../services/adminSession.service.js";
import { ADMIN_SESSION_COOKIE_NAME } from "../config/adminSession.js";
import { roleHasPermission } from "../config/rbac.js";

/**
 * Resolves the admin session cookie into `req.adminSession` + `req.admin`
 * when present. Does NOT enforce auth — pair with `requireAdmin`.
 */
export async function loadAdminSession(req, _res, next) {
  try {
    const sid = req.cookies?.[ADMIN_SESSION_COOKIE_NAME];
    if (sid) {
      const session = await findActiveAdminSession(sid);
      if (session) {
        const admin = await Admin.findById(session.adminId);
        if (admin && admin.status === "active") {
          req.adminSession = session;
          req.admin = admin;
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Rejects the request when there's no authenticated, active admin.
 */
export function requireAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Admin sign-in is required to access this resource.",
    });
  }
  next();
}

/**
 * Factory: returns middleware that enforces a single RBAC permission.
 * Assumes `requireAdmin` ran earlier in the chain.
 */
export function requirePermission(permission) {
  return function permissionGuard(req, res, next) {
    if (!req.admin) {
      return res.status(401).json({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Admin sign-in is required to access this resource.",
      });
    }
    if (!roleHasPermission(req.admin.role, permission)) {
      return res.status(403).json({
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
}
