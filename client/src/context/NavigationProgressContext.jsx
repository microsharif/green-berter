import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NavigationProgressContext = createContext(null);

const INITIAL = 0.08;
const CRAWL_INTERVAL_MS = 200;
const CRAWL_PHASE_MS = 380;
const COMPLETE_HOLD_MS = 140;
const FADE_OUT_MS = 200;

function pathsEqual(a, b) {
  return a === b;
}

function pathnameOf(path) {
  try {
    return new URL(path, window.location.origin).pathname;
  } catch {
    return path.split(/[?#]/)[0] || path;
  }
}

function toPathString(to, fallbackPathname) {
  if (typeof to === "string") return to;
  const pathname = to.pathname ?? fallbackPathname;
  return `${pathname}${to.search ?? ""}${to.hash ?? ""}`;
}

export function NavigationProgressProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef([]);
  const crawlRef = useRef(null);
  const transitioningRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timersRef.current = [];
    if (crawlRef.current) {
      clearInterval(crawlRef.current);
      crawlRef.current = null;
    }
  }, []);

  const startCrawl = useCallback(() => {
    crawlRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 0.92) return current;
        const increment = (1 - current) * (0.08 + Math.random() * 0.12);
        return Math.min(current + increment, 0.92);
      });
    }, CRAWL_INTERVAL_MS);
    timersRef.current.push(crawlRef.current);
  }, []);

  const runTransition = useCallback(
    (onComplete) => {
      if (transitioningRef.current) return;
      transitioningRef.current = true;

      clearTimers();
      setVisible(true);
      setProgress(INITIAL);
      startCrawl();

      const crawlTimer = setTimeout(() => {
        clearTimers();
        setProgress(1);

        const holdTimer = setTimeout(() => {
          onComplete();

          const resetTimer = setTimeout(() => {
            setVisible(false);
            setProgress(0);
            transitioningRef.current = false;
          }, FADE_OUT_MS);

          timersRef.current.push(resetTimer);
        }, COMPLETE_HOLD_MS);

        timersRef.current.push(holdTimer);
      }, CRAWL_PHASE_MS);

      timersRef.current.push(crawlTimer);
    },
    [clearTimers, startCrawl]
  );

  const navigateWithProgress = useCallback(
    (to, options) => {
      const target = toPathString(to, location.pathname);
      const current = `${location.pathname}${location.search}${location.hash}`;

      if (pathsEqual(target, current)) return;

      if (pathnameOf(target) === location.pathname) {
        navigate(to, options);
        return;
      }

      runTransition(() => navigate(to, options));
    },
    [location.pathname, location.search, location.hash, navigate, runTransition]
  );

  const beginProgress = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    clearTimers();
    setVisible(true);
    setProgress(INITIAL);
    startCrawl();
  }, [clearTimers, startCrawl]);

  const endProgress = useCallback(() => {
    clearTimers();
    setProgress(1);
    const resetTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      transitioningRef.current = false;
    }, FADE_OUT_MS);
    timersRef.current.push(resetTimer);
  }, [clearTimers]);

  /** Shows the top progress bar for the full duration of an async task (e.g. logout). */
  const runAsyncWithProgress = useCallback(
    async (task) => {
      beginProgress();
      try {
        return await task();
      } finally {
        endProgress();
      }
    },
    [beginProgress, endProgress]
  );

  useEffect(() => {
    function isModifiedEvent(event) {
      return (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      );
    }

    function resolveInternalPath(anchor) {
      if (anchor.hasAttribute("download")) return null;

      const targetAttr = anchor.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return null;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return null;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return null;
        return `${url.pathname}${url.search}${url.hash}`;
      } catch {
        return null;
      }
    }

    function handleClick(event) {
      if (isModifiedEvent(event)) return;

      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      const nextPath = resolveInternalPath(anchor);
      if (!nextPath) return;

      const currentPath = `${location.pathname}${location.search}${location.hash}`;
      if (pathsEqual(nextPath, currentPath)) return;

      if (pathnameOf(nextPath) === location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      navigateWithProgress(nextPath);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [location.pathname, location.search, location.hash, navigateWithProgress]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = {
    progress,
    visible,
    navigateWithProgress,
    runAsyncWithProgress,
    isTransitioning: () => transitioningRef.current,
  };

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);
  if (!context) {
    throw new Error("useNavigationProgress must be used within NavigationProgressProvider");
  }
  return context;
}

export function useProgressNavigate() {
  return useNavigationProgress().navigateWithProgress;
}
