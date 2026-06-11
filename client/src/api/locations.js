import { apiFetch } from "./client.js";

/**
 * Direct children of a location node for the Division → City → Area cascade.
 * Omit parentId to load level-0 divisions.
 */
export async function fetchLocationChildren({ parentId } = {}) {
  const search = new URLSearchParams();
  if (parentId) search.set("parentId", String(parentId));
  const res = await apiFetch(`/locations?${search.toString()}`);
  return Array.isArray(res?.locations) ? res.locations : [];
}

/**
 * Single node + breadcrumb chain (edit-form rehydration).
 */
export async function fetchLocationById(id) {
  const res = await apiFetch(`/locations/${id}`);
  return {
    location: res?.location ?? null,
    breadcrumb: Array.isArray(res?.breadcrumb) ? res.breadcrumb : [],
  };
}
