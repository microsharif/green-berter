import { apiFetch } from "./client.js";

export function loginAdmin({ email, password }) {
  return apiFetch("/admin/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getCurrentAdmin() {
  return apiFetch("/admin/auth/me");
}

export function logoutAdmin() {
  return apiFetch("/admin/auth/logout", { method: "POST" });
}
