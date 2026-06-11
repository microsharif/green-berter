import { apiFetch } from "./client.js";

/**
 * GET /membership/plans — public plan catalog (key, label, price, listing cap).
 */
export function fetchMembershipPlans() {
  return apiFetch("/membership/plans");
}

/**
 * POST /membership/orders — record a pending direct-bank-transfer purchase.
 *
 * @param {object} payload
 * @param {string} payload.plan  Paid plan key (earth | sky | sun)
 * @param {object} payload.bankTransfer  { accountName, senderReference, transferDate, note }
 */
export function createMembershipOrder(payload) {
  return apiFetch("/membership/orders", {
    method: "POST",
    body: payload,
  });
}

/**
 * GET /membership/orders — current user's purchase requests (newest first).
 */
export function fetchMyMembershipOrders() {
  return apiFetch("/membership/orders");
}

/**
 * GET /membership/orders/:id — single order for the receipt page.
 */
export function fetchMembershipOrder(orderId) {
  return apiFetch(`/membership/orders/${encodeURIComponent(orderId)}`);
}
