import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUI } from "../../context/UIContext.jsx";
import { createClaim } from "../../api/claims.js";
import { uploadProductImage } from "../../api/uploads.js";
import { ApiError } from "../../api/client.js";
import { isGive } from "../products/productUtils.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:ring-2 focus:ring-primary/40 text-on-surface text-base";

const labelClass = "block text-sm font-bold text-on-surface";

function uploadErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === "FILE_TOO_LARGE") return "Image must be 5MB or smaller.";
    if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
      return "Use a JPG, PNG, WebP, or GIF image.";
    }
    return err.message || "Could not upload your photo.";
  }
  return "Could not upload your photo.";
}

export default function ProductClaimSubmitModal({
  open,
  onClose,
  product,
  onSubmitted,
}) {
  const titleId = useId();
  const { showToast } = useUI();
  const fileRef = useRef(null);

  const exchange = !isGive(product.listingType);
  const [message, setMessage] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [offerImageUrl, setOfferImageUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setOfferTitle("");
    setOfferNotes("");
    setOfferImageUrl("");
    setFieldErrors({});
    if (fileRef.current) fileRef.current.value = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onClose]);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next["offeredItem.imageUrl"];
      return next;
    });
    try {
      const res = await uploadProductImage(file);
      setOfferImageUrl(res?.url ?? "");
    } catch (err) {
      showToast(uploadErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending) return;

    const payload = {
      listingId: product.id,
      message: message.trim(),
    };
    if (exchange) {
      payload.offeredItem = {
        title: offerTitle.trim(),
        notes: offerNotes.trim(),
        ...(offerImageUrl ? { imageUrl: offerImageUrl } : {}),
      };
    }

    setPending(true);
    setFieldErrors({});
    try {
      const claim = await createClaim(payload);
      showToast(
        exchange
          ? "Exchange proposal submitted. The owner will be notified."
          : "Claim submitted. The giver will confirm pickup details.",
        "success"
      );
      onSubmitted?.(claim);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        showToast(err.message, "error");
      } else if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Could not submit. Please try again.", "error");
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  const heading = exchange ? "Propose an exchange" : "Claim this item";

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={() => !pending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto rounded-3xl bg-surface-container-lowest p-6 sm:p-8 editorial-shadow"
      >
        <h2 id={titleId} className="text-2xl font-black font-headline mb-2">
          {heading}
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          {exchange
            ? "Describe what you are offering in trade. The owner reviews every proposal."
            : "Tell the giver why you would love this item and how you will pick it up."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {exchange ? (
            <>
              <div>
                <label className={labelClass} htmlFor="offer-title">
                  Item you are offering *
                </label>
                <input
                  id="offer-title"
                  className={inputClass}
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="e.g. Vintage floor lamp"
                  disabled={pending}
                />
                {fieldErrors["offeredItem.title"] ? (
                  <p className="text-error text-sm mt-1">
                    {fieldErrors["offeredItem.title"]}
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelClass}>Photo (optional)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="text-sm"
                  disabled={pending || uploading}
                  onChange={handleImageChange}
                />
                {offerImageUrl ? (
                  <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                    <MaterialIcon name="check_circle" className="text-sm" />
                    Image ready
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelClass} htmlFor="offer-notes">
                  Notes
                </label>
                <textarea
                  id="offer-notes"
                  rows={2}
                  className={inputClass}
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  disabled={pending}
                />
              </div>
            </>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="claim-message">
              Message {exchange ? "" : "(optional)"}
            </label>
            <textarea
              id="claim-message"
              rows={3}
              className={inputClass}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                exchange
                  ? "Why is this a fair trade?"
                  : "Pickup window, gratitude, etc."
              }
              disabled={pending}
            />
            {fieldErrors.message ? (
              <p className="text-error text-sm mt-1">{fieldErrors.message}</p>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 py-3 rounded-full border border-outline-variant font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || uploading}
              className="flex-1 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-bold editorial-shadow disabled:opacity-50"
            >
              {pending ? "Sending…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
