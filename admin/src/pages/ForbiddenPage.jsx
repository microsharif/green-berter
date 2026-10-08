import { Link } from "react-router-dom";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-muted px-6 text-center">
      <MaterialIcon name="lock" className="text-[56px] text-warning" />
      <h1 className="font-display text-3xl font-bold text-ink">Access denied</h1>
      <p className="max-w-md text-sm text-ink-soft">
        Your admin role does not have permission to view this page. Contact a
        super admin if you believe this is a mistake.
      </p>
      <Link to="/" className="admin-btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
