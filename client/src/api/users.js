import { apiFetch } from "./client.js";

/**
 * GET /users/:id — public profile fields (respects privacy settings).
 */
export function fetchUser(userId) {
  return apiFetch(`/users/${encodeURIComponent(userId)}`);
}

/**
 * PATCH /users/:id — owner-only profile update.
 *
 * @param {string} userId
 * @param {object} patch  Subset of fullName, email, phone, address, profileImageUrl, password
 */
export function updateUser(userId, patch) {
  return apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: patch,
  });
}

/**
 * GET /users/me/settings — privacy settings for the signed-in user.
 */
export function getMySettings() {
  return apiFetch("/users/me/settings");
}

/**
 * PATCH /users/me/settings — update privacy settings.
 *
 * @param {object} patch  Subset of publicDisplayName, emailVisibility, phoneVisibility
 */
export function updateMySettings(patch) {
  return apiFetch("/users/me/settings", {
    method: "PATCH",
    body: patch,
  });
}
