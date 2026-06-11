import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PROFILE_SECTIONS = [
  "dashboard",
  "listings",
  "history",
  "claims",
  "account",
  "settings",
];

const SECTION_TARGETS = {
  dashboard: "profile-dashboard",
  listings: "profile-listings",
  history: "profile-listings",
  claims: "profile-claims",
  account: "profile-account",
  settings: "profile-settings",
};

const ProfilePageContext = createContext(null);

function parseSection(hash) {
  const id = String(hash ?? "").replace(/^#/, "");
  return PROFILE_SECTIONS.includes(id) ? id : null;
}

function scrollToSection(section) {
  const targetId = SECTION_TARGETS[section] ?? "profile-listings";
  requestAnimationFrame(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function ProfilePageProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(() =>
    parseSection(location.hash)
  );

  useEffect(() => {
    if (location.pathname !== "/profile") return;
    const section = parseSection(location.hash);
    setActiveSection(section);
    if (!section) return;

    const hasNegotiateDeepLink = new URLSearchParams(location.search).has(
      "negotiate"
    );
    if (hasNegotiateDeepLink && section === "claims") {
      return;
    }

    scrollToSection(section);
  }, [location.pathname, location.hash, location.search]);

  const goToSection = useCallback(
    (section) => {
      if (!PROFILE_SECTIONS.includes(section)) return;
      setActiveSection(section);
      navigate(`/profile#${section}`, { replace: true });
      scrollToSection(section);
    },
    [navigate]
  );

  const value = useMemo(
    () => ({ activeSection, goToSection }),
    [activeSection, goToSection]
  );

  return (
    <ProfilePageContext.Provider value={value}>
      {children}
    </ProfilePageContext.Provider>
  );
}

export function useProfilePage() {
  const ctx = useContext(ProfilePageContext);
  if (!ctx) {
    throw new Error("useProfilePage must be used within ProfilePageProvider");
  }
  return ctx;
}
