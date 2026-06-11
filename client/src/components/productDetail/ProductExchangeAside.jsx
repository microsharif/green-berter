import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useProgressNavigate } from "../../hooks/useNavigationProgress.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useUI } from "../../context/UIContext.jsx";
import { updateClaim } from "../../api/claims.js";
import { ApiError } from "../../api/client.js";
import { isGive, exchangePriceLabel } from "../products/productUtils.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import ProductClaimSubmitModal from "./ProductClaimSubmitModal.jsx";
import ProductClaimStatusCard from "./ProductClaimStatusCard.jsx";
import IncomingClaimsTableModal from "../profile/IncomingClaimsTableModal.jsx";
import {
  isListingClaimable,
  listingStatusLabel,
  pendingOwnerReview,
} from "./claimUtils.js";

function AsideShell({ children, highlight = false }) {
  return (
    <div
      className={`space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm ${
        highlight ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {children}
    </div>
  );
}

function PrimaryActionButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-lg bg-primary py-4 font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ContactSellerButton() {
  function scrollToSeller() {
    document.getElementById("about-seller")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToSeller}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline py-3 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low"
    >
      <MaterialIcon name="mail" className="text-lg" />
      Contact Owner
    </button>
  );
}

export default function ProductExchangeAside({
  product,
  claims = [],
  claimsLoading = false,
  myClaim = null,
  isOwner = false,
  apiEnabled = false,
  onRefresh,
  claimsFocus = null,
}) {
  const highlightOwner = claimsFocus === "owner";
  const highlightClaimer = claimsFocus === "status";
  const { showToast } = useUI();
  const { isAuthenticated, isReady } = useAuth();
  const navigate = useProgressNavigate();
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [incomingClaimsModalOpen, setIncomingClaimsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const give = isGive(product.listingType);
  const claimable = isListingClaimable(product.status);
  const terminalListing = ["completed", "rejected", "cancelled"].includes(
    product.status
  );

  const hasActiveClaim =
    myClaim &&
    ["submitted", "pending", "accepted"].includes(myClaim.status);

  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  function openSubmit() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setModalOpen(true);
  }

  async function ownerComplete() {
    const accepted = claims.find((c) => c.status === "accepted");
    if (!accepted || refreshing) return;
    setRefreshing(true);
    try {
      await updateClaim(accepted.id, { action: "complete" });
      showToast("Listing marked complete.", "success");
      await handleRefresh();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Could not complete.",
        "error"
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (!apiEnabled) {
    return (
      <AsideShell>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {give ? "Community Gift" : "Exchange Value"}
          </p>
          <p className="text-sm text-on-surface-variant">
            Claims run on live API listings. Demo catalog items cannot be claimed
            here.
          </p>
        </div>
        {!isAuthenticated ? (
          <PrimaryActionButton onClick={() => navigate("/login", { state: { from: location } })}>
            Sign in
          </PrimaryActionButton>
        ) : null}
        <ContactSellerButton />
      </AsideShell>
    );
  }

  if (isOwner) {
    const pendingInbox = pendingOwnerReview(claims);
    const pendingCount = pendingInbox.length;

    return (
      <>
        <AsideShell highlight={highlightOwner}>
          {highlightOwner ? (
            <p className="text-sm font-bold text-primary">
              You have new claims — review them below or from your profile
              Claims section.
            </p>
          ) : null}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Owner dashboard
            </p>
            <p className="text-sm text-on-surface-variant">
              Status:{" "}
              <span className="font-bold text-on-surface">
                {listingStatusLabel(product.status)}
              </span>
            </p>
          </div>
          {claimsLoading ? (
            <p className="text-sm text-on-surface-variant">Loading claims…</p>
          ) : pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => setIncomingClaimsModalOpen(true)}
              className="text-left text-xs font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Incoming claims ({pendingCount})
            </button>
          ) : (
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Incoming claims (0)
            </p>
          )}
          {claims.some((c) => c.status === "accepted") ? (
            <PrimaryActionButton onClick={ownerComplete} disabled={refreshing}>
              Mark handoff complete
            </PrimaryActionButton>
          ) : null}
        </AsideShell>

        <IncomingClaimsTableModal
          open={incomingClaimsModalOpen}
          onClose={() => setIncomingClaimsModalOpen(false)}
          onAction={handleRefresh}
          title="Incoming claims"
          listingTitle={product.title}
          listingId={product.id}
          showListingColumn={false}
          role="owner"
          pendingReviewDefault
        />
      </>
    );
  }

  if (terminalListing) {
    return (
      <AsideShell>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {give ? "Community Gift" : "Exchange"}
          </p>
          <p className="text-sm text-on-surface-variant">
            This listing is {listingStatusLabel(product.status).toLowerCase()} and
            is no longer open for new claims.
          </p>
        </div>
        <ContactSellerButton />
      </AsideShell>
    );
  }

  return (
    <>
      <AsideShell highlight={highlightClaimer}>
        {highlightClaimer ? (
          <p className="text-sm font-bold text-primary">
            Your claim status is shown below.
          </p>
        ) : null}
        {give ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Community Gift
            </p>
            <p className="text-sm text-on-surface-variant">
              This item is offered with no trade expectation. Claim it and
              coordinate a friendly pickup.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Exchange Value
              </p>
              <div className="flex items-baseline gap-2">
                <h2 className="font-headline text-2xl font-bold text-primary">
                  {exchangePriceLabel(product) ?? product.exchange?.estimateLabel}
                </h2>
                <span className="text-sm text-on-surface-variant">
                  {product.exchange?.estimateHint}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-secondary-container bg-secondary-container/30 p-3">
              <p className="mb-1 text-xs font-semibold text-on-secondary-fixed-variant">
                Interested Item:
              </p>
              <ul className="space-y-2">
                {(product.exchange?.desiredItems || []).map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm font-semibold text-secondary"
                  >
                    <MaterialIcon name="swap_horiz" className="text-xl" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {!isReady ? (
          <p className="text-sm text-on-surface-variant">Checking session…</p>
        ) : null}

        <div className="space-y-3">
          {isReady && !isAuthenticated ? (
            <PrimaryActionButton
              onClick={() => navigate("/login", { state: { from: location } })}
            >
              Sign in to {give ? "claim" : "propose exchange"}
            </PrimaryActionButton>
          ) : null}

          {isAuthenticated && hasActiveClaim ? (
            <ProductClaimStatusCard
              claim={myClaim}
              product={product}
              busy={refreshing || claimsLoading}
              onAction={handleRefresh}
            />
          ) : null}

          {isAuthenticated && claimable && !hasActiveClaim ? (
            <PrimaryActionButton onClick={() => openSubmit()}>
              {give ? "Claim Product" : "Propose Exchange"}
            </PrimaryActionButton>
          ) : null}

          {isAuthenticated && !claimable && !hasActiveClaim ? (
            <p className="text-sm text-on-surface-variant">
              Not accepting new claims ({listingStatusLabel(product.status)}).
            </p>
          ) : null}

          <ContactSellerButton />
        </div>
      </AsideShell>

      <ProductClaimSubmitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={product}
        onSubmitted={handleRefresh}
      />
    </>
  );
}
