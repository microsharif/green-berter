import Modal from "./Modal.jsx";
import Spinner from "./Spinner.jsx";

/**
 * Confirmation modal. `tone` controls the confirm button styling.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "primary",
  loading = false,
  onConfirm,
  onClose,
}) {
  const confirmClass =
    tone === "danger" ? "admin-btn-danger" : "admin-btn-primary";
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="admin-btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner className="h-4 w-4" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message}</p>
    </Modal>
  );
}
