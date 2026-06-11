import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { markNotificationRead } from "../../api/notifications.js";
import ProductClaimNegotiationChat from "../productDetail/ProductClaimNegotiationChat.jsx";
import ClaimNegotiationBanner from "../productDetail/ClaimNegotiationBanner.jsx";
import {
  claimCardShellClass,
  claimRowDomId,
  NEGOTIABLE_CLAIM_STATUSES,
  negotiationBannerText,
  shouldShowNegotiationBanner,
} from "../productDetail/claimUtils.js";
import { useClaimNegotiationHint } from "../../hooks/useClaimNegotiationHint.js";

/**
 * Claimer row on profile — negotiate with owner via slide-in chat (profile only).
 */
export default function ProfileClaimerClaimCard({
  claim,
  negotiateOpen,
  onOpenNegotiate,
  onCloseNegotiate,
  onMessageSent,
}) {
  const { notifications, refresh: refreshNotifications } = useNotifications();
  const canNegotiate = NEGOTIABLE_CLAIM_STATUSES.includes(claim.status);
  const chatOpen = negotiateOpen;

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

  const showNegotiationBanner = shouldShowNegotiationBanner("claimer", {
    canNegotiate,
    unreadNegotiation: Boolean(unreadNegotiation),
    fromOwner,
    fromClaimer,
    bothMessaged,
  });

  const bannerMessage = negotiationBannerText("claimer", { bothMessaged });

  async function handleOpenNegotiate(e) {
    e.preventDefault();
    if (unreadNegotiation?.id) {
      try {
        await markNotificationRead(unreadNegotiation.id);
        await refreshNotifications();
      } catch {
        /* open chat anyway */
      }
    }
    onOpenNegotiate?.(claim.id);
  }

  async function handleMessageSent() {
    await reloadThreadHint();
    await onMessageSent?.();
  }

  const label =
    claim.type === "exchange_proposal" ? "Exchange proposal" : "Give claim";

  return (
    <li>
      <article
        id={claimRowDomId(claim.id)}
        className={claimCardShellClass(chatOpen)}
      >
        <div
          className={`space-y-3 transition-opacity duration-200 ${
            chatOpen ? "opacity-30 pointer-events-none" : ""
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-bold text-sm text-green-900 dark:text-green-100">
                {label}
              </p>
              <p className="text-xs text-zinc-500 capitalize">
                Status: {claim.status.replace(/_/g, " ")}
              </p>
              {claim.message ? (
                <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                  {claim.message}
                </p>
              ) : null}
            </div>

            {claim.listingId ? (
              <Link
                to={{
                  pathname: `/products/${claim.listingId}`,
                  search: "?claims=status",
                }}
                className="text-sm font-bold text-primary hover:underline shrink-0"
              >
                View listing →
              </Link>
            ) : null}
          </div>

          {showNegotiationBanner ? (
            <ClaimNegotiationBanner
              message={bannerMessage}
              onNegotiate={handleOpenNegotiate}
            />
          ) : null}
        </div>

        <ProductClaimNegotiationChat
          claim={claim}
          open={chatOpen}
          onClose={onCloseNegotiate}
          onMessageSent={handleMessageSent}
        />
      </article>
    </li>
  );
}
