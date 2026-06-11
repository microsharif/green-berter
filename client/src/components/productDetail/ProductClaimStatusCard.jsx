import { useState } from "react";
import { useUI } from "../../context/UIContext.jsx";
import { updateClaim } from "../../api/claims.js";
import { ApiError } from "../../api/client.js";
import { claimStatusLabel } from "./claimUtils.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

/**
 * DFD §4.1 ack + §4.3 lifecycle — claimer view of their claim on this listing.
 */
export default function ProductClaimStatusCard({
  claim,
  product,
  busy,
  onAction,
}) {
  const { showToast } = useUI();
  const [acting, setActing] = useState(false);

  if (!claim) return null;

  const status = claim.status;
  const canCancel = ["submitted", "pending"].includes(status);
  const canComplete = status === "accepted";

  async function handleCancel() {
    if (acting || busy) return;
    setActing(true);
    try {
      await updateClaim(claim.id, { action: "cancel" });
      showToast(
        product.listingType === "exchange"
          ? "Proposal withdrawn."
          : "Claim withdrawn.",
        "info"
      );
      await onAction?.();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Could not cancel claim.",
        "error"
      );
    } finally {
      setActing(false);
    }
  }

  async function handleComplete() {
    if (acting || busy) return;
    setActing(true);
    try {
      await updateClaim(claim.id, { action: "complete" });
      showToast("Marked complete. Thank you for participating!", "success");
      await onAction?.();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Could not complete.",
        "error"
      );
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary-container/10 p-5 space-y-4">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MaterialIcon name="info" className="text-primary mt-0.5" />
          <div>
            <p className="font-headline font-bold text-primary">
              {product.listingType === "exchange"
                ? "Your proposal"
                : "Your claim"}
            </p>
            <p className="text-sm text-on-surface-variant">
              {claimStatusLabel(status)}
            </p>
          </div>
        </div>

        {claim.message ? (
          <p className="text-sm text-on-surface-variant italic">
            &ldquo;{claim.message}&rdquo;
          </p>
        ) : null}

        {canComplete ? (
          <button
            type="button"
            disabled={acting || busy}
            onClick={handleComplete}
            className="w-full py-3 rounded-full bg-emerald-600 text-white font-bold text-sm disabled:opacity-50"
          >
            {acting ? "Saving…" : "Mark handoff complete"}
          </button>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            disabled={acting || busy}
            onClick={handleCancel}
            className="w-full py-2 rounded-full border border-outline-variant text-sm font-bold disabled:opacity-50"
          >
            {product.listingType === "exchange"
              ? "Withdraw proposal"
              : "Withdraw claim"}
          </button>
        ) : null}

        {status === "rejected" || status === "cancelled" ? (
          <p className="text-xs text-zinc-500">
            Browse other{" "}
            {product.listingType === "give" ? "gifts" : "exchanges"} on the
            catalog.
          </p>
        ) : null}
      </div>
    </div>
  );
}
