/**
 * Mirror of the server-side permission strings (server/src/config/rbac.js).
 * Used for UI gating only — the server is always the source of truth.
 */
export const PERMISSIONS = Object.freeze({
  ANALYTICS_READ: "analytics:read",
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  LISTINGS_READ: "listings:read",
  LISTINGS_WRITE: "listings:write",
  CATALOG_READ: "catalog:read",
  CATALOG_WRITE: "catalog:write",
  ADMINS_MANAGE: "admins:manage",
});

export const ROLE_LABELS = Object.freeze({
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
});
