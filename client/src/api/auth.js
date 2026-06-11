import { apiFetch } from "./client.js";

/**
 * POST /auth/register
 * Persists a new user in MongoDB. Returns sanitized user record.
 *
 * `profileImageUrl` is optional and, when present, must be a URL we minted
 * ourselves from POST /upload/profile-image (the server validates that the
 * URL points into `/upload/<date>/profile/...`).
 */
export function registerUser({
  fullName,
  email,
  phone,
  address,
  password,
  profileImageUrl,
}) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: {
      fullName,
      email,
      phone,
      address,
      password,
      ...(profileImageUrl ? { profileImageUrl } : null),
    },
  });
}

/**
 * POST /auth/login
 * Verifies credentials and sets an httpOnly session cookie. Returns the
 * sanitized user plus csrfToken + expiresAt.
 */
export function loginUser({ email, password }) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/**
 * GET /auth/me
 * Restores the session from the cookie. Throws ApiError(401) when no valid
 * session exists.
 */
export function getCurrentUser() {
  return apiFetch("/auth/me");
}

/**
 * POST /auth/logout
 * Destroys the server-side session and clears the cookie. Idempotent.
 */
export function logoutUser() {
  return apiFetch("/auth/logout", { method: "POST" });
}

/**
 * POST /auth/forgot-password
 * Issues a one-time verification code and emails it to the account address.
 * Returns `{ ok, message, expiresInMinutes }`.
 */
export function requestPasswordReset({ email }) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

/**
 * POST /auth/verify-reset-otp
 * Verifies the emailed code; on success returns a short-lived
 * `resetToken` used by `resetPassword`.
 */
export function verifyPasswordResetOtp({ email, code }) {
  return apiFetch("/auth/verify-reset-otp", {
    method: "POST",
    body: { email, code },
  });
}

/**
 * POST /auth/reset-password
 * Exchanges a verified `resetToken` for a new password. Server revokes all
 * existing sessions for the user afterwards.
 */
export function resetPassword({ email, resetToken, password }) {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    body: { email, resetToken, password },
  });
}
