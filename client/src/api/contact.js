import { apiFetch } from "./client.js";

/**
 * @param {{ name: string, email: string, message: string, subject?: string }} payload
 */
export async function submitContactMessage(payload) {
  return apiFetch("/contact", {
    method: "POST",
    body: payload,
  });
}
