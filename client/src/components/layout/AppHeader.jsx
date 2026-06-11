import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";
import NotificationBell from "../notifications/NotificationBell.jsx";
import AppMobileMenu from "./AppMobileMenu.jsx";
import BrandLogo from "./BrandLogo.jsx";

const navInactive =
  "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium text-sm Inter transition-colors duration-300";

const navActive =
  "text-emerald-600 dark:text-emerald-400 font-semibold text-sm Inter transition-colors duration-300";

export default function AppHeader() {
  const { isAuthenticated, user } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 border-t border-slate-200/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl shadow-sm dark:shadow-none dark:border-t-zinc-800/80">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
        <BrandLogo />
        <div className="hidden md:flex items-center gap-10 lg:gap-12">
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
            to="/about-us"
            className={({ isActive }) => (isActive ? navActive : navInactive)}
          >
            About Us
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) => (isActive ? navActive : navInactive)}
          >
            Contact
          </NavLink>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <div className="md:hidden">
              <NotificationBell />
            </div>
          ) : null}
          <div className="hidden md:flex items-center space-x-3 sm:space-x-4">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <Link
                  to="/profile"
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all duration-300 active:scale-95 inline-flex"
                  aria-label="Account"
                  title={user?.fullName ? `Profile — ${user.fullName}` : "Profile"}
                >
                  <img
                    src={user?.profileImageDataUrl || DEMO_PROFILE_AVATAR_URL}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover border border-emerald-700/20 dark:border-emerald-500/30"
                  />
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border-2 border-emerald-700 dark:border-emerald-500 px-5 py-2 text-sm font-bold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors duration-300"
              >
                Login
              </Link>
            )}
          </div>
          <AppMobileMenu isAuthenticated={isAuthenticated} user={user} />
        </div>
      </div>
    </nav>
  );
}
