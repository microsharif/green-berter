import { apiFetch, buildQuery } from "./client.js";

export function fetchListings(params = {}) {
  return apiFetch(`/admin/listings${buildQuery(params)}`);
}

export function fetchListing(id) {
  return apiFetch(`/admin/listings/${id}`);
}

export function updateListing(id, patch) {
  return apiFetch(`/admin/listings/${id}`, { method: "PATCH", body: patch });
}

export function changeListingStatus(id, action, reason) {
  return apiFetch(`/admin/listings/${id}/status`, {
    method: "PATCH",
    body: { action, reason },
  });
}

export function deleteListing(id) {
  return apiFetch(`/admin/listings/${id}`, { method: "DELETE" });
}
