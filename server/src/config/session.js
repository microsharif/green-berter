/**
 * Centralized session / cookie config.
 * All values can be overridden via .env (see server/.env).
 */
export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "almadot.sid";

export const SESSION_TTL_DAYS = Math.max(
  1,
  Number(process.env.SESSION_TTL_DAYS) || 1
);

export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const CSRF_HEADER_NAME =
  process.env.CSRF_HEADER_NAME || "x-csrf-token";

/**
 * Cookie options used when issuing the session cookie.
 *  - httpOnly: JS cannot read it (mitigates XSS exfiltration)
 *  - sameSite=lax: standard CSRF defense for top-level navigation
 *  - secure: only over HTTPS in production
 */
export function buildSessionCookieOptions(expiresAt) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  };
}
