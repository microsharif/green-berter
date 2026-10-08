import { apiFetch, buildQuery } from "./client.js";

export function fetchUsers(params = {}) {
  return apiFetch(`/admin/users${buildQuery(params)}`);
}

export function fetchUser(id) {
  return apiFetch(`/admin/users/${id}`);
}

export function updateUser(id, patch) {
  return apiFetch(`/admin/users/${id}`, { method: "PATCH", body: patch });
}

export function changeUserStatus(id, action, reason) {
  return apiFetch(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: { action, reason },
  });
}
