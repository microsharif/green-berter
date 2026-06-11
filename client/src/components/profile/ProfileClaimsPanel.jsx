import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchClaims } from "../../api/claims.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import {
  activeClaimerClaims,
  INCOMING_CLAIMS_PREVIEW_LIMIT,
  latestClaimerClaimsPreview,
  pendingOwnerReview,
  scrollClaimCardIntoViewDeferred,
} from "../productDetail/claimUtils.js";
import ProductClaimOwnerInbox from "../productDetail/ProductClaimOwnerInbox.jsx";
import ProfileClaimerClaimCard from "./ProfileClaimerClaimCard.jsx";
import IncomingClaimsTableModal from "./IncomingClaimsTableModal.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

/**
 * Profile hub for DFD §4.2 — owner reviews incoming claims; claimer tracks their proposals.
 */
export default function ProfileClaimsPanel() {
  const { user } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [ownerClaims, setOwnerClaims] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [ownerNegotiateClaimId, setOwnerNegotiateClaimId] = useState(null);
  const [claimerNegotiateClaimId, setClaimerNegotiateClaimId] = useState(null);
  const [incomingClaimsModalOpen, setIncomingClaimsModalOpen] = useState(false);
  const [myClaimsModalOpen, setMyClaimsModalOpen] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const [asOwner, asClaimer] = await Promise.all([
        fetchClaims({ role: "owner", limit: 50 }),
        fetchClaims({ role: "claimer", limit: 50 }),
      ]);
      setOwnerClaims(asOwner.claims);
      setMyClaims(asClaimer.claims);
    } catch {
      if (!silent) {
        setOwnerClaims([]);
        setMyClaims([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const fromUrl = searchParams.get("negotiate");
    if (!fromUrl || loading) return;

    const inOwner = ownerClaims.some(
      (c) => String(c.id) === String(fromUrl)
    );
    const inClaimer = myClaims.some((c) => String(c.id) === String(fromUrl));

    if (inOwner) {
      setOwnerNegotiateClaimId(fromUrl);
      setClaimerNegotiateClaimId(null);
    } else if (inClaimer) {
      setClaimerNegotiateClaimId(fromUrl);
      setOwnerNegotiateClaimId(null);
    }
  }, [searchParams, ownerClaims, myClaims, loading]);

  const negotiateFromUrl = searchParams.get("negotiate");

  useEffect(() => {
    if (!negotiateFromUrl || loading) return;

    const ownerOpen =
      String(ownerNegotiateClaimId) === String(negotiateFromUrl);
    const claimerOpen =
      String(claimerNegotiateClaimId) === String(negotiateFromUrl);
    if (!ownerOpen && !claimerOpen) return;

    return scrollClaimCardIntoViewDeferred(negotiateFromUrl);
  }, [
    negotiateFromUrl,
    loading,
    ownerNegotiateClaimId,
    claimerNegotiateClaimId,
  ]);

  function openClaimerNegotiate(claimId) {
    setClaimerNegotiateClaimId(claimId);
  }

  function closeClaimerNegotiate() {
    setClaimerNegotiateClaimId(null);
  }

  async function handleOwnerAction() {
    await load({ silent: true });
    await refreshNotifications();
  }

  async function handleClaimerAction() {
    await load({ silent: true });
    await refreshNotifications();
  }

  const inbox = pendingOwnerReview(ownerClaims);
  const activeMineAll = activeClaimerClaims(myClaims);
  const activeMinePreview = latestClaimerClaimsPreview(myClaims);
  const activeMinePreviewIds = new Set(
    activeMinePreview.map((c) => String(c.id))
  );
  const claimerNegotiateExtra =
    claimerNegotiateClaimId &&
    !activeMinePreviewIds.has(String(claimerNegotiateClaimId))
      ? myClaims.filter(
          (c) => String(c.id) === String(claimerNegotiateClaimId)
        )
      : [];
  const displayMine = [...activeMinePreview, ...claimerNegotiateExtra];
  const hasMoreMine = activeMineAll.length > INCOMING_CLAIMS_PREVIEW_LIMIT;

  return (
    <RevealOnScroll as="section" id="profile-claims" className="scroll-mt-24 space-y-10">
      <div>
        <h2 className="text-2xl font-black text-green-900 dark:text-green-100">
          Claims & proposals
        </h2>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
          When someone claims your listing, review and accept or reject here or from
          the notification bell. When you claim or propose an exchange, you will be
          notified when the owner responds.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading activity…</p>
      ) : (
        <>
          <RevealOnScroll delay={80}>
            <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h3 className="font-bold text-green-900 flex items-center gap-2">
              <MaterialIcon name="inbox" />
              Incoming on your listings
              {inbox.length > 0 ? (
                <span className="text-xs bg-secondary text-white px-2 py-0.5 rounded-full">
                  {inbox.length}
                </span>
              ) : null}
            </h3>
            {inbox.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold font-label uppercase tracking-widest text-zinc-500">
                    Incoming claims ({inbox.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setIncomingClaimsModalOpen(true)}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    View all incoming claims
                  </button>
                </div>
                <ProductClaimOwnerInbox
                  claims={ownerClaims}
                  busy={loading}
                  onAction={handleOwnerAction}
                  negotiateClaimId={ownerNegotiateClaimId}
                  onOpenNegotiate={setOwnerNegotiateClaimId}
                  onCloseNegotiate={() => setOwnerNegotiateClaimId(null)}
                />
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                No pending claims to review. New proposals appear here and in your
                notifications.
              </p>
            )}
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={160}>
            <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h3 className="font-bold text-green-900 flex items-center gap-2">
              <MaterialIcon name="send" />
              Your claims & proposals
              {activeMineAll.length > 0 ? (
                <span className="text-xs bg-secondary text-white px-2 py-0.5 rounded-full">
                  {activeMineAll.length}
                </span>
              ) : null}
            </h3>
            {activeMineAll.length === 0 ? (
              <p className="text-sm text-zinc-500">
                You have no active claims. Browse listings and tap Claim or Propose
                Exchange on a product page.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold font-label uppercase tracking-widest text-zinc-500">
                    Active claims ({activeMineAll.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setMyClaimsModalOpen(true)}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    View all your claims
                  </button>
                </div>
                {hasMoreMine ? (
                  <p className="text-xs text-zinc-500">
                    Showing the {INCOMING_CLAIMS_PREVIEW_LIMIT} most recent of{" "}
                    {activeMineAll.length} active claims.
                  </p>
                ) : null}
                <ul className="space-y-3">
                  {displayMine.map((claim) => (
                    <ProfileClaimerClaimCard
                      key={claim.id}
                      claim={claim}
                      negotiateOpen={
                        String(claimerNegotiateClaimId) === String(claim.id)
                      }
                      onOpenNegotiate={openClaimerNegotiate}
                      onCloseNegotiate={closeClaimerNegotiate}
                      onMessageSent={handleClaimerAction}
                    />
                  ))}
                </ul>
              </>
            )}
            </div>
          </RevealOnScroll>
        </>
      )}

      <IncomingClaimsTableModal
        open={incomingClaimsModalOpen}
        onClose={() => setIncomingClaimsModalOpen(false)}
        onAction={handleOwnerAction}
        role="owner"
        pendingReviewDefault
      />

      <IncomingClaimsTableModal
        open={myClaimsModalOpen}
        onClose={() => setMyClaimsModalOpen(false)}
        onAction={handleClaimerAction}
        role="claimer"
        title="Your claims & proposals"
        pendingReviewDefault={false}
      />
    </RevealOnScroll>
  );
}
