import { Link } from "react-router-dom";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <MaterialIcon name="search_off" className="text-[56px] text-ink-faint" />
      <h1 className="font-display text-2xl font-bold text-ink">Page not found</h1>
      <Link to="/" className="admin-btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
