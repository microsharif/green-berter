import { useAdminAuth } from "../../context/AdminAuthContext.jsx";

/**
 * Conditionally renders children when the current admin has `permission`.
 * Use to hide action buttons (edit, delete, approve) from read-only roles.
 */
export default function PermissionGate({ permission, fallback = null, children }) {
  const { hasPermission } = useAdminAuth();
  if (permission && !hasPermission(permission)) return fallback;
  return children;
}
