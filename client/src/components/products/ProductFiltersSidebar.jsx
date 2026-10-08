import { useCallback, useEffect, useRef, useState } from "react";
import ProductFiltersPanel from "./ProductFiltersPanel.jsx";

/** Desktop-only sticky filter sidebar (hidden on mobile). */
export default function ProductFiltersSidebar() {
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
      className="hidden lg:block w-64 flex-shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`profile-sidebar-scroll sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain pr-1 ${
          scrollbarVisible ? "profile-sidebar-scroll--visible" : ""
        }`}
        onScroll={handleScroll}
      >
        <ProductFiltersPanel />
      </div>
    </aside>
  );
}
