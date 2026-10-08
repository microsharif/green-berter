import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { PageLoader } from "../ui/Spinner.jsx";

/**
 * Gate for the authenticated admin shell. Waits for the initial /me probe
 * (`isReady`) before deciding, then redirects unauthenticated visitors to the
 * login page (preserving the intended destination). An optional `permission`
 * blocks access when the admin's role lacks it.
 */
export default function ProtectedRoute({ permission, children }) {
  const { isReady, isAuthenticated, hasPermission } = useAdminAuth();
  const location = useLocation();

  if (!isReady) return <PageLoader label="Restoring session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
