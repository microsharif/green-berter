import { useEffect } from "react";
import { createPortal } from "react-dom";
import EditListingForm from "./EditListingForm.jsx";

/**
 * Modal editor for PATCH /listings/:id — owner-only listing update.
 * Portaled to document.body so ancestor transforms (e.g. RevealOnScroll)
 * cannot break fixed positioning or clip the dialog.
 */
export default function EditListingModal({ open, product, onClose, onSaved }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !product) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] w-full sm:max-w-xl max-h-[min(92dvh,92vh)] sm:max-h-[min(88dvh,88vh)] min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-green-900/10 border border-green-900/5 overflow-hidden"
      >
        <EditListingForm
          product={product}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
