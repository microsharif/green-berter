import { useEffect } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "./MaterialIcon.jsx";

export default function Modal({ open, title, onClose, children, footer, width = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${width} overflow-hidden rounded-2xl bg-surface shadow-panel`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-faint hover:bg-surface-muted hover:text-ink"
            aria-label="Close"
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 thin-scroll">
          {children}
        </div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-surface-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
