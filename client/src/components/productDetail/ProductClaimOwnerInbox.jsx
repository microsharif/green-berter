import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUI } from "../../context/UIContext.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { updateClaim } from "../../api/claims.js";
import { markNotificationRead } from "../../api/notifications.js";
import { ApiError } from "../../api/client.js";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";
import {
  claimCardShellClass,
  claimRowDomId,
  INCOMING_CLAIMS_PREVIEW_LIMIT,
  latestIncomingClaimsPreview,
  NEGOTIABLE_CLAIM_STATUSES,
  negotiationBannerText,
  pendingOwnerReview,
  shouldShowNegotiationBanner,
} from "./claimUtils.js";
import ProductClaimNegotiationChat from "./ProductClaimNegotiationChat.jsx";
import ClaimNegotiationBanner from "./ClaimNegotiationBanner.jsx";
import { useClaimNegotiationHint } from "../../hooks/useClaimNegotiationHint.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function claimerName(claim) {
  return claim.claimer?.fullName?.trim() || "A community member";
}

function OwnerClaimCard({
  claim,
  busyThis,
  reviewable,
  chatOpen,
  onRunAction,
  onOpenNegotiate,
  onCloseNegotiate,
  onAction,
}) {
  const { notifications, refresh: refreshNotifications } = useNotifications();
  const isExchange = claim.type === "exchange_proposal";
  const offer = claim.offeredItem ?? {};
  const canNegotiate = NEGOTIABLE_CLAIM_STATUSES.includes(claim.status);

  const {
    fromOwner,
    fromClaimer,
    bothMessaged,
    reload: reloadThreadHint,
  } = useClaimNegotiationHint(claim, canNegotiate);

  const unreadNegotiation = useMemo(
    () =>
      notifications.find(
        (n) =>
          !n.read &&
          n.type === "claim_message" &&
          String(n.relatedClaimId) === String(claim.id)
      ),
    [notifications, claim.id]
  );

  const showNegotiationBanner = shouldShowNegotiationBanner("owner", {
    canNegotiate,
    unreadNegotiation: Boolean(unreadNegotiation),
    fromOwner,
    fromClaimer,
    bothMessaged,
  });

  const bannerMessage = negotiationBannerText("owner", { bothMessaged });

  async function handleOpenNegotiate() {
    if (unreadNegotiation?.id) {
      try {
        await markNotificationRead(unreadNegotiation.id);
        await refreshNotifications();
      } catch {
        /* open chat anyway */
      }
    }
    onOpenNegotiate(claim.id);
  }

  async function handleMessageSent() {
    await reloadThreadHint();
    await onAction?.();
  }

  return (
    <article id={claimRowDomId(claim.id)} className={claimCardShellClass(chatOpen)}>
      <div
        className={`space-y-3 transition-opacity duration-200 ${
          chatOpen ? "opacity-30 pointer-events-none" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-headline font-bold">{claimerName(claim)}</p>
            <p className="text-xs text-zinc-500">
              {isExchange ? "Exchange proposal" : "Give claim"} · {claim.status}
            </p>
          </div>

          {claim.listingId ? (
            <Link
              to={{
                pathname: `/products/${claim.listingId}`,
                search: "?claims=owner",
              }}
              className="text-sm font-bold text-primary hover:underline shrink-0"
            >
              View listing →
            </Link>
          ) : null}
        </div>

        {claim.message ? (
          <p className="text-sm text-on-surface-variant">{claim.message}</p>
        ) : null}

        {isExchange && offer.title ? <OfferPreview offer={offer} /> : null}

        {showNegotiationBanner ? (
          <ClaimNegotiationBanner
            message={bannerMessage}
            onNegotiate={handleOpenNegotiate}
            disabled={busyThis}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {reviewable ? (
            <>
              <button
                type="button"
                disabled={busyThis}
                onClick={() => onRunAction(claim.id, "accept")}
                className="px-6 py-2.5 rounded-full font-bold text-sm bg-primary text-white shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busyThis}
                onClick={() => onRunAction(claim.id, "reject")}
                className="px-6 py-2.5 rounded-full font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          ) : null}
          {canNegotiate && !showNegotiationBanner ? (
            <button
              type="button"
              disabled={busyThis}
              onClick={handleOpenNegotiate}
              className="px-6 py-2.5 rounded-full font-bold text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Negotiate
            </button>
          ) : null}
        </div>
      </div>
      <ProductClaimNegotiationChat
        claim={claim}
        open={chatOpen}
        onClose={onCloseNegotiate}
        onMessageSent={handleMessageSent}
      />
    </article>
  );
}

/**
 * DFD §4.2 — owner accept / reject / negotiate on incoming claims.
 */
export default function ProductClaimOwnerInbox({
  claims,
  busy,
  onAction,
  negotiateClaimId,
  onOpenNegotiate,
  onCloseNegotiate,
}) {
  const { showToast } = useUI();
  const [actingId, setActingId] = useState(null);
  const [localNegotiateId, setLocalNegotiateId] = useState(null);

  const activeNegotiateId = negotiateClaimId ?? localNegotiateId;
  const openNegotiate = useCallback(
    (claimId) => {
      if (onOpenNegotiate) onOpenNegotiate(claimId);
      else setLocalNegotiateId(claimId);
    },
    [onOpenNegotiate]
  );
  const closeNegotiate = useCallback(() => {
    if (onCloseNegotiate) onCloseNegotiate();
    else setLocalNegotiateId(null);
  }, [onCloseNegotiate]);

  const pendingAll = pendingOwnerReview(claims);
  const pending = latestIncomingClaimsPreview(claims);
  const pendingIds = new Set(pending.map((c) => c.id));
  const negotiateOnly =
    activeNegotiateId && !pendingIds.has(activeNegotiateId)
      ? claims.filter((c) => String(c.id) === String(activeNegotiateId))
      : [];
  const display = [...pending, ...negotiateOnly];
  const hasMore = pendingAll.length > INCOMING_CLAIMS_PREVIEW_LIMIT;

  async function runAction(claimId, action) {
    if (actingId || busy) return;
    setActingId(claimId);
    try {
      await updateClaim(claimId, { action });
      const labels = {
        accept: "Claim accepted. The claimer has been notified.",
        reject: "Claim declined.",
      };
      showToast(labels[action] ?? "Updated.", "success");
      await onAction?.();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Could not update claim.",
        "error"
      );
    } finally {
      setActingId(null);
    }
  }

  if (!display.length) {
    return (
      <p className="text-sm text-on-surface-variant">
        No new claims to review. You will be notified when someone submits
        interest.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasMore ? (
        <p className="text-xs text-zinc-500">
          Showing the {INCOMING_CLAIMS_PREVIEW_LIMIT} most recent of{" "}
          {pendingAll.length} incoming claims. Use &ldquo;View all incoming
          claims&rdquo; to see every claim.
        </p>
      ) : null}
      {display.map((claim) => {
        const busyThis = actingId === claim.id;
        const chatOpen = activeNegotiateId === claim.id;
        const reviewable = pendingIds.has(claim.id);

        return (
          <OwnerClaimCard
            key={claim.id}
            claim={claim}
            busyThis={busyThis}
            reviewable={reviewable}
            chatOpen={chatOpen}
            onRunAction={runAction}
            onOpenNegotiate={openNegotiate}
            onCloseNegotiate={closeNegotiate}
            onAction={onAction}
          />
        );
      })}
    </div>
  );
}

function OfferPreview({ offer }) {
  return (
    <div className="flex gap-3 items-center text-sm bg-surface-container-lowest p-3 rounded-xl">
      {offer.imageUrl ? (
        <img
          src={resolveMediaUrl(offer.imageUrl)}
          alt=""
          className="w-14 h-14 rounded-lg object-cover"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center">
          <MaterialIcon name="inventory_2" />
        </div>
      )}
      <div>
        <p className="font-bold">{offer.title}</p>
        {offer.notes ? (
          <p className="text-xs text-zinc-500">{offer.notes}</p>
        ) : null}
      </div>
    </div>
  );
}
