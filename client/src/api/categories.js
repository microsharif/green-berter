import { apiFetch } from "./client.js";

/**
 * Fetches the **direct children** of a category — i.e. one level of the
 * cascading category picker. Always scoped to a `listingType` ("give" or
 * "exchange") so we never accidentally mix the two trees.
 *
 * - Omit `parentId` to get the level-1 nodes for that tree (the toggle
 *   already represents the root, so we skip it in the UI).
 * - Pass a category id to drill one level deeper.
 *
 * @param {{ listingType: "give" | "exchange", parentId?: string | null }} params
 * @returns {Promise<Array<Category>>}
 */
export async function fetchCategoryChildren({ listingType, parentId } = {}) {
  const search = new URLSearchParams({ listingType });
  if (parentId) search.set("parentId", String(parentId));
  const res = await apiFetch(`/categories?${search.toString()}`);
  return Array.isArray(res?.categories) ? res.categories : [];
}

/** Single node + breadcrumb chain (edit-form rehydration). */
export async function fetchCategoryById(id) {
  const res = await apiFetch(`/categories/${encodeURIComponent(id)}`);
  return {
    category: res?.category ?? null,
    breadcrumb: Array.isArray(res?.breadcrumb) ? res.breadcrumb : [],
  };
}
