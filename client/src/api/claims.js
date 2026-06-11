import { apiFetch } from "./client.js";

/** Submit a Give claim or Exchange proposal (DFD §4.1). */
export async function createClaim(payload) {
  const res = await apiFetch("/claims", { method: "POST", body: payload });
  return res?.claim ?? null;
}

/**
 * @param {{
 *   listingId?: string,
 *   role?: "owner" | "claimer",
 *   status?: string,
 *   claimType?: string,
 *   search?: string,
 *   pendingReview?: boolean,
 *   receivedFrom?: string,
 *   receivedTo?: string,
 *   limit?: number,
 *   offset?: number,
 * }} params
 */
export async function fetchClaims(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "pendingReview") {
      if (v) search.set(k, "true");
      continue;
    }
    search.set(k, String(v));
  }
  const qs = search.toString();
  const res = await apiFetch(`/claims${qs ? `?${qs}` : ""}`);
  return {
    claims: Array.isArray(res?.claims) ? res.claims : [],
    total: res?.total ?? 0,
    limit: res?.limit ?? 20,
    offset: res?.offset ?? 0,
  };
}

export async function fetchClaim(id) {
  const res = await apiFetch(`/claims/${encodeURIComponent(id)}`);
  return res?.claim ?? null;
}

/**
 * Owner / claimer actions (DFD §4.2–§4.3).
 * @param {string} id
 * @param {{ action: "accept"|"reject"|"complete"|"cancel", message?: string }} body
 */
export async function updateClaim(id, body) {
  const res = await apiFetch(`/claims/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return {
    claim: res?.claim ?? null,
    listing: res?.listing ?? null,
  };
}
