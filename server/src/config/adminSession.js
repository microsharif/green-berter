/**
 * Centralized admin session / cookie config. Mirrors `config/session.js` but
 * with its own cookie name + TTL so admin auth is fully independent of the
 * end-user session.
 */
export const ADMIN_SESSION_COOKIE_NAME =
  process.env.ADMIN_SESSION_COOKIE_NAME || "almadot.admin.sid";

export const ADMIN_SESSION_TTL_DAYS = Math.max(
  1,
  Number(process.env.ADMIN_SESSION_TTL_DAYS) || 1
);

export const ADMIN_SESSION_TTL_MS =
  ADMIN_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const ADMIN_CSRF_HEADER_NAME =
  process.env.ADMIN_CSRF_HEADER_NAME || "x-admin-csrf-token";

/**
 * Cookie options used when issuing the admin session cookie.
 *  - httpOnly: JS cannot read it (mitigates XSS exfiltration)
 *  - sameSite=lax: standard CSRF defense for top-level navigation
 *  - secure: only over HTTPS in production
 */
export function buildAdminSessionCookieOptions(expiresAt) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  };
}
