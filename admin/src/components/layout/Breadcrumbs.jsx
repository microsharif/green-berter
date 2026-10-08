import { Link, useLocation } from "react-router-dom";
import { titleCase } from "../../utils/format.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const ROOT_LABELS = {
  users: "Users",
  listings: "Listings",
  catalog: "Catalog",
};

/**
 * Auto-derives breadcrumbs from the path. Detail pages pass a `trail` override
 * so a record id segment can be replaced with a human label.
 */
export default function Breadcrumbs({ trail }) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs =
    trail ??
    segments.map((seg, idx) => ({
      label: ROOT_LABELS[seg] ?? titleCase(seg),
      to: `/${segments.slice(0, idx + 1).join("/")}`,
    }));

  return (
    <nav className="flex items-center gap-1 text-sm text-ink-faint" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-primary-600">
        Dashboard
      </Link>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.to ?? crumb.label} className="flex items-center gap-1">
            <MaterialIcon name="chevron_right" className="text-[16px]" />
            {isLast || !crumb.to ? (
              <span className="font-semibold text-ink">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-primary-600">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
