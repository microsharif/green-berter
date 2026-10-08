import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";

const NAV_LINKS = [
  { to: "/", end: true, label: "Home", icon: "home" },
  { to: "/products", label: "Browse", icon: "storefront" },
  { to: "/upload?mode=give", label: "Give/Exchange", icon: "swap_horiz" },
  { to: "/membership", label: "Membership", icon: "workspace_premium" },
  { to: "/about-us", label: "About Us", icon: "info" },
  { to: "/contact", label: "Contact", icon: "mail" },
];

function mobileNavClass({ isActive }) {
  const base =
    "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors";
  return isActive
    ? `${base} bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400`
    : `${base} text-slate-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-zinc-800`;
}

/**
 * Mobile hamburger drawer — all primary nav links plus login/profile actions.
 */
export default function AppMobileMenu({ isAuthenticated, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    []
  );

  const drawer =
    open &&
    createPortal(
      <div className="fixed inset-0 z-[200] md:hidden" role="presentation">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]"
          onClick={closeMenu}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          className="absolute top-0 right-0 flex h-full w-[min(20rem,88vw)] flex-col bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200/80 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Menu
            </span>
            <button
              type="button"
              onClick={closeMenu}
              className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close menu"
            >
              <MaterialIcon name="close" className="text-2xl" />
            </button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-1">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={mobileNavClass}
                onClick={closeMenu}
              >
                <MaterialIcon name={item.icon} className="text-xl opacity-80" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 px-4 py-5 space-y-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <img
                    src={user?.profileImageDataUrl || DEMO_PROFILE_AVATAR_URL}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover border border-emerald-700/20"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {user?.fullName || "My profile"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                  </div>
                  <MaterialIcon name="chevron_right" className="text-zinc-400 ml-auto shrink-0" />
                </Link>

                {onLogout ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onLogout();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <MaterialIcon name="logout" className="text-xl" aria-hidden />
                    Log out
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-700 dark:border-emerald-500 px-5 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <MaterialIcon name="login" className="text-lg" aria-hidden />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 dark:bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:brightness-105 transition-all"
                >
                  <MaterialIcon name="person_add" className="text-lg" aria-hidden />
                  Create account
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MaterialIcon name={open ? "close" : "menu"} className="text-2xl" />
      </button>
      {drawer}
    </>
  );
}
