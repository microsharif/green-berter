import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigationProgress } from "../../hooks/useNavigationProgress.js";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";
import NotificationBell from "../notifications/NotificationBell.jsx";
import AppMobileMenu from "../layout/AppMobileMenu.jsx";
import BrandLogo from "../layout/BrandLogo.jsx";

const navInactive =
  "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium text-sm Inter transition-colors duration-300";

const navActive =
  "text-emerald-600 dark:text-emerald-400 font-semibold text-sm Inter transition-colors duration-300";

export default function ProfileTopNav() {
  const { logout, finishLogout, user, isAuthenticated, loggingOut } = useAuth();
  const { runAsyncWithProgress } = useNavigationProgress();
  const navigate = useNavigate();

  async function handleLogout() {
    if (loggingOut) return;

    await runAsyncWithProgress(async () => {
      await logout();
      navigate("/", { replace: true });
      finishLogout();
    });
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-t-zinc-800/80">
      <div className="flex justify-between items-center px-6 py-4 max-w-full mx-auto">
        <BrandLogo />
        <nav className="hidden md:flex items-center gap-10 lg:gap-12">
          <NavLink to="/" end className={({ isActive }) => (isActive ? navActive : navInactive)}>
            Home
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) => (isActive ? navActive : navInactive)}
          >
            Browse
          </NavLink>
          <NavLink
            to="/upload?mode=give"
            className={({ isActive }) => (isActive ? navActive : navInactive)}
          >
            Give/Exchange
          </NavLink>
          <NavLink
            to="/membership"
            className={({ isActive }) => (isActive ? navActive : navInactive)}
          >
            Membership
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) => (isActive ? navActive : navInactive)}
          >
            Contact
          </NavLink>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {(isAuthenticated && user) || loggingOut ? (
            <div className="md:hidden">
              <NotificationBell iconClassName="text-zinc-600 text-2xl" />
            </div>
          ) : null}
          <div className="hidden md:flex items-center gap-3 sm:gap-4">
            {(isAuthenticated && user) || loggingOut ? (
              <>
                {user ? (
                  <>
                    <span
                      className="hidden sm:inline text-sm text-zinc-500 dark:text-zinc-400 max-w-[10rem] truncate"
                      title={user.email}
                    >
                      {user.fullName}
                    </span>
                    <img
                      src={user.profileImageDataUrl || DEMO_PROFILE_AVATAR_URL}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-600"
                    />
                  </>
                ) : null}
                <NotificationBell iconClassName="text-zinc-600 text-2xl" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-green-800 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                >
                  {loggingOut ? "Logging out…" : "Log out"}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm font-bold text-green-800 dark:text-green-400 hover:underline"
              >
                Log in
              </Link>
            )}
          </div>
          <AppMobileMenu
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={isAuthenticated || loggingOut ? handleLogout : undefined}
          />
        </div>
      </div>
    </header>
  );
}
