import { PERMISSIONS } from "../../constants/permissions.js";

/**
 * Single source of truth for sidebar navigation. New phases/modules drop in
 * here as an extra entry (with the permission that gates them).
 */
export const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    icon: "dashboard",
    permission: PERMISSIONS.ANALYTICS_READ,
    end: true,
  },
  {
    to: "/users",
    label: "Users",
    icon: "group",
    permission: PERMISSIONS.USERS_READ,
  },
  {
    to: "/listings",
    label: "Listings",
    icon: "inventory_2",
    permission: PERMISSIONS.LISTINGS_READ,
  },
  {
    to: "/catalog",
    label: "Catalog",
    icon: "category",
    permission: PERMISSIONS.CATALOG_READ,
  },
];
