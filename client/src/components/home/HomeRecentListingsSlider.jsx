import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import ProductCardRecent from "../products/ProductCardRecent.jsx";

const ITEMS_PER_PAGE_DESKTOP = 4;
const AUTO_PLAY_MS = 5000;
const MANUAL_PAUSE_MS = 8000;
const MOBILE_ITEMS_MQ = "(max-width: 639px)";
const DESKTOP_ITEMS_MQ = "(min-width: 1024px)";

function chunkItems(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

function resolveItemsPerPage() {
  if (typeof window === "undefined") return ITEMS_PER_PAGE_DESKTOP;
  if (window.matchMedia(MOBILE_ITEMS_MQ).matches) return 1;
  if (window.matchMedia(DESKTOP_ITEMS_MQ).matches) return ITEMS_PER_PAGE_DESKTOP;
  return 2;
}

function useItemsPerPage() {
  const [itemsPerPage, setItemsPerPage] = useState(resolveItemsPerPage);

  useEffect(() => {
    const mobileMq = window.matchMedia(MOBILE_ITEMS_MQ);
    const desktopMq = window.matchMedia(DESKTOP_ITEMS_MQ);
    const update = () => setItemsPerPage(resolveItemsPerPage());

    update();
    mobileMq.addEventListener("change", update);
    desktopMq.addEventListener("change", update);
    return () => {
      mobileMq.removeEventListener("change", update);
      desktopMq.removeEventListener("change", update);
    };
  }, []);

  return itemsPerPage;
}

function pageGridClass(itemsPerPage) {
  if (itemsPerPage === 1) return "grid-cols-1";
  if (itemsPerPage === 2) return "grid-cols-2";
  return "grid-cols-4";
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function SliderTabs({ count, active, onSelect }) {
  if (count <= 1) {
    return (
      <div className="mt-4 flex justify-center" aria-hidden>
        <span className="block h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-primary-container shadow-sm" />
      </div>
    );
  }

  return (
    <div className="mt-4 flex justify-center">
      <div
        className="inline-flex items-center gap-2.5 rounded-full border border-outline-variant/20 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm"
        role="tablist"
        aria-label="Recent listing pages"
      >
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Page ${index + 1} of ${count}`}
            onClick={() => onSelect(index)}
            className={`rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
              index === active
                ? "h-2 w-10 bg-gradient-to-r from-primary to-primary-container shadow-[0_2px_8px_rgba(13,99,27,0.25)]"
                : "h-2 w-2 bg-primary/20 hover:bg-primary/40 hover:scale-110"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function NavButton({ direction, onClick, disabled, label }) {
  const isPrev = direction === "prev";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/25 bg-white text-primary shadow-[0_4px_16px_rgba(13,99,27,0.1)] ring-2 ring-primary transition-all duration-200 hover:border-primary hover:bg-primary hover:text-on-primary hover:ring-white hover:shadow-[0_6px_22px_rgba(13,99,27,0.22)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-0 ${
        isPrev ? "left-[10px]" : "right-[10px]"
      }`}
    >
      <MaterialIcon
        name={isPrev ? "chevron_left" : "chevron_right"}
        className="text-xl leading-none transition-transform duration-200 group-hover:scale-110"
      />
    </button>
  );
}

export default function HomeRecentListingsSlider({ products }) {
  const [activePage, setActivePage] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const manualPauseTimerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const itemsPerPage = useItemsPerPage();

  const pages = useMemo(
    () => chunkItems(products, itemsPerPage),
    [products, itemsPerPage]
  );
  const pageCount = pages.length;

  useEffect(() => {
    setActivePage(0);
  }, [products, itemsPerPage]);

  useEffect(() => {
    if (activePage > pageCount - 1) {
      setActivePage(Math.max(0, pageCount - 1));
    }
  }, [activePage, pageCount]);

  useEffect(
    () => () => {
      if (manualPauseTimerRef.current) {
        clearTimeout(manualPauseTimerRef.current);
      }
    },
    []
  );

  const pauseAfterInteraction = useCallback(() => {
    setInteractionPaused(true);
    if (manualPauseTimerRef.current) {
      clearTimeout(manualPauseTimerRef.current);
    }
    manualPauseTimerRef.current = setTimeout(() => {
      setInteractionPaused(false);
      manualPauseTimerRef.current = null;
    }, MANUAL_PAUSE_MS);
  }, []);

  const goToPage = useCallback(
    (index, { fromUser = false } = {}) => {
      if (fromUser) pauseAfterInteraction();
      setActivePage(Math.max(0, Math.min(index, pageCount - 1)));
    },
    [pageCount, pauseAfterInteraction]
  );

  const goPrev = useCallback(() => {
    pauseAfterInteraction();
    setActivePage((prev) => (prev - 1 + pageCount) % pageCount);
  }, [pageCount, pauseAfterInteraction]);

  const goNext = useCallback(() => {
    pauseAfterInteraction();
    setActivePage((prev) => (prev + 1) % pageCount);
  }, [pageCount, pauseAfterInteraction]);

  const autoPlayPaused = hoverPaused || interactionPaused || prefersReducedMotion;

  useEffect(() => {
    if (pageCount <= 1 || autoPlayPaused) return undefined;

    const id = window.setInterval(() => {
      setActivePage((prev) => (prev + 1) % pageCount);
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(id);
  }, [pageCount, autoPlayPaused]);

  if (!products.length) {
    return (
      <p className="text-center text-on-surface-variant py-12">
        No recent listings yet. Be the first to post!
      </p>
    );
  }

  const showNav = pageCount > 1;

  return (
    <>
      <SliderTabs
        count={pageCount}
        active={activePage}
        onSelect={(index) => goToPage(index, { fromUser: true })}
      />

      <div
        className="relative mt-8 sm:mt-10 w-full"
        role="region"
        aria-roledescription="carousel"
        aria-label="Recent listings"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onFocusCapture={() => setHoverPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setHoverPaused(false);
          }
        }}
      >
        {showNav ? (
          <>
            <NavButton
              direction="prev"
              onClick={goPrev}
              disabled={false}
              label="Previous listings"
            />
            <NavButton
              direction="next"
              onClick={goNext}
              disabled={false}
              label="Next listings"
            />
          </>
        ) : null}

        <div className="overflow-x-clip w-full">
          <div
            className="flex transition-transform duration-500 ease-out will-change-transform"
            style={{
              width: `${pageCount * 100}%`,
              transform: `translateX(-${(activePage * 100) / pageCount}%)`,
            }}
            aria-live="polite"
          >
            {pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                className={`shrink-0 grid gap-6 box-border ${pageGridClass(itemsPerPage)}`}
                style={{ width: `${100 / pageCount}%` }}
                role="tabpanel"
                aria-hidden={pageIndex !== activePage}
              >
                {page.map((product) => (
                  <ProductCardRecent key={product.id} product={product} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
