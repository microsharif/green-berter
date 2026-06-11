import { useLayoutEffect, useState } from "react";

const GAP_PX = 4;
const VIEWPORT_PADDING = 12;
const PREFERRED_MAX_HEIGHT = 208;

/**
 * Fixed coordinates for a dropdown anchored to an input (escapes overflow:hidden parents).
 */
export function useFloatingMenuPosition(anchorRef, open) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null);
      return undefined;
    }

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const spaceBelow =
        window.innerHeight - rect.bottom - GAP_PX - VIEWPORT_PADDING;
      const spaceAbove = rect.top - GAP_PX - VIEWPORT_PADDING;

      let maxHeight = Math.min(PREFERRED_MAX_HEIGHT, spaceBelow);
      let top = rect.bottom + GAP_PX;

      if (maxHeight < 96 && spaceAbove > spaceBelow) {
        maxHeight = Math.min(PREFERRED_MAX_HEIGHT, spaceAbove);
        top = Math.max(
          VIEWPORT_PADDING,
          rect.top - GAP_PX - maxHeight
        );
      }

      setStyle({
        position: "fixed",
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(96, maxHeight),
        zIndex: 300,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(anchorRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  return style;
}
