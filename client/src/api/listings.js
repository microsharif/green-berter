import { apiFetch } from "./client.js";

/**
 * Create a new listing (DFD §2 step 3+4). Caller must already have uploaded
 * the product image via `uploadProductImage` and pass the resulting URL.
 *
 * @param {object} payload Validated by the server; see listing.controller.js.
 * @returns {Promise<Listing>}
 */
export async function createListing(payload) {
  const res = await apiFetch("/listings", { method: "POST", body: payload });
  return res?.listing ?? null;
}

/** Fetch a single listing by id. */
export async function fetchListing(id) {
  const res = await apiFetch(`/listings/${encodeURIComponent(id)}`);
  return res?.listing ?? null;
}

/**
 * Browse / filter listings.
 *
 * @param {{
 *   listingType?: "give" | "exchange",
 *   ownerUserId?: string,
 *   categoryId?: string,
 *   status?: string,
 *   search?: string,
 *   areaId?: string,
 *   divisionName?: string,
 *   cityName?: string,
 *   maxReferencePrice?: number,
 *   limit?: number,
 *   offset?: number,
 * }} params
 * @returns {Promise<{ listings: Listing[], total: number, limit: number, offset: number }>}
 */
export async function fetchListings(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const qs = search.toString();
  const res = await apiFetch(`/listings${qs ? `?${qs}` : ""}`);
  return {
    listings: Array.isArray(res?.listings) ? res.listings : [],
    total: res?.total ?? 0,
    limit: res?.limit ?? 20,
    offset: res?.offset ?? 0,
  };
}

/** Owner-only edit. Patch only the fields you want to change. */
export async function updateListing(id, patch) {
  const res = await apiFetch(`/listings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  return res?.listing ?? null;
}

/** Owner-only delete. Resolves on success, throws ApiError otherwise. */
export async function deleteListing(id) {
  await apiFetch(`/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export const RELATED_LISTINGS_LIMIT = 6;

/**
 * Related exchange listings for product detail (reference price within half–double range).
 * @param {{ referencePrice: number, excludeId?: string }} params
 */
export async function fetchRelatedListingsByPrice({
  referencePrice,
  excludeId,
}) {
  const rp = Number(referencePrice);
  if (!Number.isFinite(rp) || rp < 0) {
    return { listings: [], referencePrice: rp, limit: RELATED_LISTINGS_LIMIT };
  }

  const search = new URLSearchParams();
  search.set("referencePrice", String(rp));
  if (excludeId) search.set("excludeId", String(excludeId));

  const res = await apiFetch(`/listings/related-by-price?${search}`);
  return {
    listings: Array.isArray(res?.listings) ? res.listings : [],
    referencePrice: res?.referencePrice ?? rp,
    limit: res?.limit ?? RELATED_LISTINGS_LIMIT,
  };
}

/**
 * Related give listings for "You might also like" (same leaf category).
 * @param {{ categoryId: string, excludeId?: string }} params
 */
export async function fetchRelatedListingsByCategory({
  categoryId,
  excludeId,
}) {
  const cid = String(categoryId ?? "").trim();
  if (!cid) {
    return { listings: [], categoryId: cid, limit: RELATED_LISTINGS_LIMIT };
  }

  const search = new URLSearchParams();
  search.set("categoryId", cid);
  if (excludeId) search.set("excludeId", String(excludeId));

  const res = await apiFetch(`/listings/related-by-category?${search}`);
  return {
    listings: Array.isArray(res?.listings) ? res.listings : [],
    categoryId: res?.categoryId ?? cid,
    limit: res?.limit ?? RELATED_LISTINGS_LIMIT,
  };
}
