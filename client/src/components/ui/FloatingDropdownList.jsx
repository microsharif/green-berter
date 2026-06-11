import { createPortal } from "react-dom";
import { useFloatingMenuPosition } from "./useFloatingMenuPosition.js";

const LIST_CLASS =
  "overflow-y-auto overscroll-contain rounded-lg border border-outline-variant bg-surface-container-lowest shadow-xl py-1";

/**
 * Renders a listbox in a document portal so it is not clipped by overflow:hidden ancestors.
 */
export default function FloatingDropdownList({
  anchorRef,
  open,
  listboxId,
  children,
  className = LIST_CLASS,
}) {
  const style = useFloatingMenuPosition(anchorRef, open);

  if (!open || !style) return null;

  return createPortal(
    <ul id={listboxId} role="listbox" style={style} className={className}>
      {children}
    </ul>,
    document.body
  );
}
