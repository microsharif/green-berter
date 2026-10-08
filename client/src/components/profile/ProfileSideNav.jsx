import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useProfilePage } from "../../context/ProfilePageContext.jsx";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";
import { getPlanDisplay } from "../../data/membershipPlans.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const DEFAULT_TAGLINE = "Regenerative Pioneer";

function navItemClass(isActive) {
  return `flex items-center gap-3 px-4 py-3 transition-all rounded-lg w-full text-left ${
    isActive
      ? "text-green-800 bg-green-50 font-bold"
      : "text-zinc-500 hover:bg-zinc-200 font-medium"
  }`;
}

/**
 * DFD §3 — Sidebar identity (name, avatar, membership) from session payload.
 * In-page sections scroll within the profile; Dashboard returns to the hero.
 */
export default function ProfileSideNav() {
  const { user } = useAuth();
  const { activeSection, goToSection } = useProfilePage();
  const displayName = user?.fullName?.trim() || "Member";
  const avatarSrc = user?.profileImageDataUrl || DEMO_PROFILE_AVATAR_URL;
  const plan = getPlanDisplay(user?.membership?.plan);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const isHoveringRef = useRef(false);
  const hideTimerRef = useRef(null);

  const revealScrollbar = useCallback(() => {
    setScrollbarVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!isHoveringRef.current) setScrollbarVisible(false);
    }, 700);
  }, []);

  function handleMouseEnter() {
    isHoveringRef.current = true;
    revealScrollbar();
  }

  function handleMouseLeave() {
    isHoveringRef.current = false;
    scheduleHide();
  }

  function handleScroll() {
    revealScrollbar();
    if (!isHoveringRef.current) scheduleHide();
  }

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    []
  );

  return (
    <aside
      className="fixed left-0 top-24 z-40 hidden h-[calc(100vh-6rem)] w-64 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 md:flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`profile-sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-6 ${
          scrollbarVisible ? "profile-sidebar-scroll--visible" : ""
        }`}
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-8 min-h-full">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container">
              <img
                className="w-full h-full object-cover"
                alt={displayName}
                src={avatarSrc}
              />
            </div>
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-100">{displayName}</p>
              <p className="text-xs text-zinc-500">{DEFAULT_TAGLINE}</p>
              <p className="text-xs text-zinc-500 mt-1">{plan.label}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => goToSection("dashboard")}
              className={navItemClass(activeSection === "dashboard")}
            >
              <MaterialIcon name="dashboard" />
              <span className="text-sm">Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("listings")}
              className={navItemClass(activeSection === "listings")}
            >
              <MaterialIcon name="inventory_2" />
              <span className="text-sm">My Listings</span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("claims")}
              className={navItemClass(activeSection === "claims")}
            >
              <MaterialIcon name="notifications_active" />
              <span className="text-sm">Claims</span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("history")}
              className={navItemClass(activeSection === "history")}
            >
              <MaterialIcon name="sync_alt" />
              <span className="text-sm">Swaps</span>
            </button>
          </nav>
          <div className="mt-auto flex flex-col gap-2 border-t border-zinc-200 pt-6">
            <button
              type="button"
              onClick={() => goToSection("settings")}
              className={navItemClass(activeSection === "settings")}
            >
              <MaterialIcon name="settings" />
              <span className="text-sm">Settings</span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("account")}
              className={navItemClass(activeSection === "account")}
            >
              <MaterialIcon name="person_pin" />
              <span className="text-sm">Account Info</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
