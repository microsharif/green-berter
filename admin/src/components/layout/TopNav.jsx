import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { ROLE_LABELS } from "../../constants/permissions.js";
import { initials } from "../../utils/format.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function TopNav({ onMenuClick }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-surface/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        className="rounded-lg p-2 text-ink-soft hover:bg-surface-muted lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <MaterialIcon name="menu" />
      </button>

      <div className="hidden lg:block" />

      <div className="relative ml-auto" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-muted"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {initials(admin?.fullName)}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">
              {admin?.fullName}
            </p>
            <p className="text-xs leading-tight text-ink-faint">
              {ROLE_LABELS[admin?.role] ?? admin?.role}
            </p>
          </div>
          <MaterialIcon name="expand_more" className="text-ink-faint" />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-surface-border bg-surface shadow-panel">
            <div className="border-b border-surface-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">
                {admin?.fullName}
              </p>
              <p className="truncate text-xs text-ink-faint">{admin?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger hover:bg-surface-muted"
            >
              <MaterialIcon name="logout" className="text-[20px]" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
