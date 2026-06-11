import { useEffect } from "react";

/**
 * @param {boolean} active
 * @param {React.RefObject<HTMLElement | null>} anchorRef
 * @param {string} [portalElementId] — id of portaled listbox to treat as inside
 * @param {() => void} onDismiss
 */
export function useDismissOnOutsidePointer(
  active,
  anchorRef,
  portalElementId,
  onDismiss
) {
  useEffect(() => {
    if (!active) return undefined;

    function handlePointerDown(e) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (portalElementId) {
        const portal = document.getElementById(portalElementId);
        if (portal?.contains(target)) return;
      }
      onDismiss();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [active, anchorRef, portalElementId, onDismiss]);
}
