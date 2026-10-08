import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./navConfig.js";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function Sidebar({ open, onClose }) {
  const { hasPermission } = useAdminAuth();
  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-border bg-surface transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-surface-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <MaterialIcon name="eco" className="text-[22px]" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-extrabold text-ink">
              GreanBarter
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-600">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 thin-scroll">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                }`
              }
            >
              <MaterialIcon name={item.icon} className="text-[20px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-border p-4 text-xs text-ink-faint">
          GreanBarter Admin · Phase 1
        </div>
      </aside>
    </>
  );
}
