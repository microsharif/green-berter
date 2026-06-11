import { apiFetch } from "./client.js";

/**
 * Uploads a profile image to the server and returns the public URL the
 * caller should later submit alongside the registration payload.
 *
 * @param {File} file  Image picked from the registration form.
 * @returns {Promise<{ url: string, bytes: number }>}
 */
export function uploadProfileImage(file) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch("/upload/profile-image", {
    method: "POST",
    body: form,
  });
}

/**
 * Uploads a product listing image. Reserved for the listing-submit flow
 * (currently not wired in the UI) so we have a single, consistent API for
 * both kinds of uploads.
 *
 * @param {File} file
 * @returns {Promise<{ url: string, bytes: number }>}
 */
export function uploadProductImage(file) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch("/upload/product-image", {
    method: "POST",
    body: form,
  });
}
