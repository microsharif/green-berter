import { findActiveSession } from "../services/session.service.js";
import { SESSION_COOKIE_NAME } from "../config/session.js";

/**
 * Resolves the session cookie into `req.session` + `req.userId` when present.
 * Does NOT enforce auth — pair with `requireAuth` for protected routes.
 */
export async function loadSession(req, _res, next) {
  try {
    const sid = req.cookies?.[SESSION_COOKIE_NAME];
    if (sid) {
      const session = await findActiveSession(sid);
      if (session) {
        req.session = session;
        req.userId = session.userId;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "You must be signed in to access this resource.",
    });
  }
  next();
}
