import { apiFetch, buildQuery } from "./client.js";

export function fetchOverview() {
  return apiFetch("/admin/analytics/overview");
}

export function fetchGrowth({ metric = "users", range = "30d" } = {}) {
  return apiFetch(`/admin/analytics/growth${buildQuery({ metric, range })}`);
}

export function fetchRecent() {
  return apiFetch("/admin/analytics/recent");
}
