/**
 * Role-Based Access Control for the admin dashboard.
 *
 * Admins live in their own `admins` collection (see `models/Admin.js`) and are
 * fully separate from end-user accounts. Each admin has exactly one `role`;
 * the role expands to a flat set of `permissions` that the API middleware
 * (`requirePermission`) and the admin frontend (`PermissionGate`) check.
 */

export const ADMIN_ROLES = Object.freeze([
  "super_admin",
  "admin",
  "moderator",
]);

export const DEFAULT_ADMIN_ROLE = "moderator";

/**
 * Every permission the system understands. Format: `<resource>:<action>`.
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

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

/**
 * Role → permission map. `super_admin` implicitly has every permission.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: ALL_PERMISSIONS,
  admin: Object.freeze([
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.LISTINGS_READ,
    PERMISSIONS.LISTINGS_WRITE,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_WRITE,
  ]),
  moderator: Object.freeze([
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.LISTINGS_READ,
    PERMISSIONS.LISTINGS_WRITE,
    PERMISSIONS.CATALOG_READ,
  ]),
});

export function isValidRole(role) {
  return ADMIN_ROLES.includes(role);
}

/**
 * Returns the flat list of permissions granted to a role (empty for unknown).
 */
export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : [];
}

/**
 * Whether a role grants a specific permission. `super_admin` always passes.
 */
export function roleHasPermission(role, permission) {
  if (role === "super_admin") return true;
  return permissionsForRole(role).includes(permission);
}
