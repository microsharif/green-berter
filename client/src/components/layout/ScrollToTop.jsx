import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  // Only reset scroll on route path changes — not ?query updates (e.g. negotiate=).
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const negotiateDeepLink =
      pathname === "/profile" &&
      hash === "#claims" &&
      new URLSearchParams(search).has("negotiate");
    if (negotiateDeepLink) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
    }
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
