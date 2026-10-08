import { apiFetch, buildQuery } from "./client.js";

export function fetchCategories(params = {}) {
  return apiFetch(`/admin/categories${buildQuery(params)}`);
}

export function createCategory(body) {
  return apiFetch("/admin/categories", { method: "POST", body });
}

export function updateCategory(id, patch) {
  return apiFetch(`/admin/categories/${id}`, { method: "PATCH", body: patch });
}

export function fetchLocations(params = {}) {
  return apiFetch(`/admin/locations${buildQuery(params)}`);
}

export function createLocation(body) {
  return apiFetch("/admin/locations", { method: "POST", body });
}

export function updateLocation(id, patch) {
  return apiFetch(`/admin/locations/${id}`, { method: "PATCH", body: patch });
}
