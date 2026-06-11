import { apiFetch } from "./client.js";

export async function fetchUnreadNotificationCount() {
  const res = await apiFetch("/notifications/unread-count");
  return res?.unreadCount ?? 0;
}

/**
 * @param {{ limit?: number, offset?: number, unreadOnly?: boolean }} params
 */
export async function fetchNotifications(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const qs = search.toString();
  const res = await apiFetch(`/notifications${qs ? `?${qs}` : ""}`);
  return {
    notifications: Array.isArray(res?.notifications) ? res.notifications : [],
    total: res?.total ?? 0,
    limit: res?.limit ?? 30,
    offset: res?.offset ?? 0,
  };
}

export async function markNotificationRead(id) {
  const res = await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
  return res?.notification ?? null;
}

export async function markAllNotificationsRead() {
  const res = await apiFetch("/notifications/read-all", { method: "PATCH" });
  return res?.modifiedCount ?? 0;
}
