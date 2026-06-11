import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 120;
const DIRECTION_DELTA = 8;

/**
 * Fixed back-to-top control — visible while scrolling down, hidden while scrolling up.
 */
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);

  const updateVisibility = useCallback(() => {
    const y = window.scrollY;
    const delta = y - lastScrollY.current;

    if (y < SCROLL_THRESHOLD) {
      setVisible(false);
    } else if (delta > DIRECTION_DELTA) {
      setVisible(true);
    } else if (delta < -DIRECTION_DELTA) {
      setVisible(false);
    }

    lastScrollY.current = y;
  }, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateVisibility();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateVisibility]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95 ${
        visible
          ? "pointer-events-auto opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-3"
      }`}
    >
      <span className="material-symbols-outlined text-xl" aria-hidden="true">
        arrow_upward
      </span>
    </button>
  );
}
