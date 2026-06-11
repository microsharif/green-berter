import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isReady, loggingOut } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div
        className="min-h-[50vh] flex items-center justify-center text-on-surface-variant text-sm"
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated && !loggingOut) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
