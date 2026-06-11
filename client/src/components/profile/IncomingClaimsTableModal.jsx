import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useUI } from "../../context/UIContext.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { fetchClaims, updateClaim } from "../../api/claims.js";
import { markNotificationRead } from "../../api/notifications.js";
import { ApiError } from "../../api/client.js";
import {
  NEGOTIABLE_CLAIM_STATUSES,
  negotiationStatusLabel,
} from "../productDetail/claimUtils.js";
import ProductClaimNegotiationChat from "../productDetail/ProductClaimNegotiationChat.jsx";
import { useClaimNegotiationHint } from "../../hooks/useClaimNegotiationHint.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import SkeuomorphicPagination from "../ui/SkeuomorphicPagination.jsx";

const PAGE_SIZE = 20;

const CANCELLABLE_STATUSES = ["submitted", "pending"];

function NegotiationStatusCell({ claim, modalOpen, refreshKey, role }) {
  const { notifications } = useNotifications();
  const canNegotiate = NEGOTIABLE_CLAIM_STATUSES.includes(claim.status);

  const { fromOwner, fromClaimer, bothMessaged, hasMessages, loading } =
    useClaimNegotiationHint(claim, modalOpen && canNegotiate, refreshKey);

  const unreadNegotiation = notifications.some(
    (n) =>
      !n.read &&
      n.type === "claim_message" &&
      String(n.relatedClaimId) === String(claim.id)
  );

  const label = negotiationStatusLabel(role, {
    canNegotiate,
    bothMessaged,
    fromOwner,
    fromClaimer,
    hasMessages,
    unreadNegotiation,
  });

  if (!canNegotiate) {
    return <span className="text-zinc-400">—</span>;
  }

  if (loading) {
    return <span className="text-xs text-zinc-400">Loading…</span>;
  }

  if (!label) {
    return <span className="text-zinc-400">Not started</span>;
  }

  const isOngoing = label === "Ongoing negotiation";

  return (
    <span
      className={`text-xs font-medium leading-snug max-w-[140px] inline-block ${
        isOngoing
          ? "text-primary"
          : "text-zinc-600 dark:text-zinc-400"
      }`}
      title={label}
    >
      {label}
    </span>
  );
}

function claimerName(claim) {
  return claim.claimer?.fullName?.trim() || "Community member";
}

function claimTypeLabel(claim) {
  return claim.type === "exchange_proposal" ? "Exchange" : "Give";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const btnAccept =
  "px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-primary text-white shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap";
const btnReject =
  "px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap";
const btnNegotiate =
  "px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap";
const btnWithdraw =
  "px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-red-600/10 text-red-700 hover:bg-red-600/15 transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap";

/**
 * Paginated claims table for owner incoming claims or claimer proposals.
 */
export default function IncomingClaimsTableModal({
  open,
  onClose,
  onAction,
  title = "All incoming claims",
  listingTitle = null,
  showListingColumn = true,
  listingId = null,
  /** "owner" | "claimer" */
  role = "owner",
  /** When true and no date filter, limits to submitted + pending (owner). */
  pendingReviewDefault = true,
  pageSize = PAGE_SIZE,
}) {
  const titleId = useId();
  const isOwner = role === "owner";
  const { showToast } = useUI();
  const { notifications, refresh: refreshNotifications } = useNotifications();

  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");

  const [actingId, setActingId] = useState(null);
  const [negotiateClaimId, setNegotiateClaimId] = useState(null);
  const [activeNegotiateClaim, setActiveNegotiateClaim] = useState(null);
  const [rejectPendingId, setRejectPendingId] = useState(null);
  const [rejectConfirmed, setRejectConfirmed] = useState(false);
  const [cancelPendingId, setCancelPendingId] = useState(null);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [negotiationRefreshKey, setNegotiationRefreshKey] = useState(0);

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const hasDateFilter = Boolean(appliedDateFrom || appliedDateTo);

  const rejectPendingClaim = useMemo(
    () => claims.find((c) => c.id === rejectPendingId) ?? null,
    [claims, rejectPendingId]
  );

  const cancelPendingClaim = useMemo(
    () => claims.find((c) => c.id === cancelPendingId) ?? null,
    [claims, cancelPendingId]
  );

  const closeNegotiateChat = useCallback(() => {
    setNegotiateClaimId(null);
    setActiveNegotiateClaim(null);
  }, []);

  const resetTransient = useCallback(() => {
    closeNegotiateChat();
    setRejectPendingId(null);
    setRejectConfirmed(false);
    setCancelPendingId(null);
    setCancelConfirmed(false);
  }, [closeNegotiateChat]);

  const reloadList = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!open) {
      resetTransient();
      setActingId(null);
      setPage(0);
      setDateFromInput("");
      setDateToInput("");
      setAppliedDateFrom("");
      setAppliedDateTo("");
      setClaims([]);
      setTotal(0);
    }
  }, [open, resetTransient]);

  useEffect(() => {
    if (!open) return;
    setPage(0);
  }, [appliedDateFrom, appliedDateTo, open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      setListLoading(true);
      try {
        const params = {
          limit: pageSize,
          offset: page * pageSize,
          receivedFrom: appliedDateFrom || undefined,
          receivedTo: appliedDateTo || undefined,
        };

        if (isOwner && pendingReviewDefault && !hasDateFilter) {
          params.pendingReview = true;
        }

        if (listingId) {
          params.listingId = listingId;
        } else {
          params.role = role;
        }

        const res = await fetchClaims(params);
        if (cancelled) return;

        setClaims(res.claims);
        setTotal(res.total);

        const maxPage = Math.max(0, Math.ceil(res.total / pageSize) - 1);
        if (page > maxPage) {
          setPage(maxPage);
        }
      } catch (err) {
        if (cancelled) return;
        showToast(
          err instanceof ApiError ? err.message : "Could not load claims.",
          "error"
        );
        setClaims([]);
        setTotal(0);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    page,
    pageSize,
    listingId,
    role,
    isOwner,
    pendingReviewDefault,
    appliedDateFrom,
    appliedDateTo,
    hasDateFilter,
    reloadToken,
    showToast,
  ]);

  useEffect(() => {
    if (!negotiateClaimId || !open) return;
    const fresh = claims.find(
      (c) => String(c.id) === String(negotiateClaimId)
    );
    if (fresh) setActiveNegotiateClaim(fresh);
  }, [claims, negotiateClaimId, open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") {
        if (negotiateClaimId) {
          closeNegotiateChat();
          return;
        }
        if (rejectPendingId) {
          setRejectPendingId(null);
          setRejectConfirmed(false);
          return;
        }
        if (cancelPendingId) {
          setCancelPendingId(null);
          setCancelConfirmed(false);
          return;
        }
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [
    open,
    onClose,
    negotiateClaimId,
    rejectPendingId,
    cancelPendingId,
    closeNegotiateChat,
  ]);

  function applyDateFilter() {
    closeNegotiateChat();
    setAppliedDateFrom(dateFromInput);
    setAppliedDateTo(dateToInput);
    setPage(0);
  }

  function clearDateFilter() {
    closeNegotiateChat();
    setDateFromInput("");
    setDateToInput("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setPage(0);
  }

  function goToPage(nextPage) {
    closeNegotiateChat();
    setPage(nextPage);
  }

  async function runAction(claimId, action) {
    if (actingId) return;
    setActingId(claimId);
    try {
      await updateClaim(claimId, { action });
      const labels = {
        accept: "Claim accepted. The claimer has been notified.",
        reject: "Claim declined.",
        cancel: "Claim withdrawn.",
      };
      showToast(labels[action] ?? "Updated.", "success");
      if (action === "reject") {
        setRejectPendingId(null);
        setRejectConfirmed(false);
        if (String(negotiateClaimId) === String(claimId)) closeNegotiateChat();
      }
      if (action === "cancel") {
        setCancelPendingId(null);
        setCancelConfirmed(false);
        if (String(negotiateClaimId) === String(claimId)) closeNegotiateChat();
      }
      await onAction?.();
      setNegotiationRefreshKey((k) => k + 1);

      const wasOnlyItem = claims.length === 1;
      if (
        wasOnlyItem &&
        page > 0 &&
        (action === "accept" || action === "reject" || action === "cancel")
      ) {
        setPage((p) => p - 1);
      } else {
        reloadList();
      }
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Could not update claim.",
        "error"
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleClaimAction() {
    await onAction?.();
    setNegotiationRefreshKey((k) => k + 1);
    reloadList();
  }

  function handleRejectClick(claimId) {
    setRejectPendingId(claimId);
    setRejectConfirmed(false);
    setCancelPendingId(null);
    setCancelConfirmed(false);
    if (String(negotiateClaimId) === String(claimId)) closeNegotiateChat();
  }

  function handleCancelClick(claimId) {
    setCancelPendingId(claimId);
    setCancelConfirmed(false);
    setRejectPendingId(null);
    setRejectConfirmed(false);
    if (String(negotiateClaimId) === String(claimId)) closeNegotiateChat();
  }

  function handleOpenNegotiate(claim) {
    if (!claim?.id) return;
    setRejectPendingId(null);
    setRejectConfirmed(false);
    setCancelPendingId(null);
    setCancelConfirmed(false);
    setActiveNegotiateClaim(claim);
    setNegotiateClaimId(String(claim.id));

    const unread = notifications.find(
      (n) =>
        !n.read &&
        n.type === "claim_message" &&
        String(n.relatedClaimId) === String(claim.id)
    );
    if (!unread?.id) return;
    void (async () => {
      try {
        await markNotificationRead(unread.id);
        await refreshNotifications();
        setNegotiationRefreshKey((k) => k + 1);
      } catch {
        /* chat already open */
      }
    })();
  }

  async function handleConfirmReject() {
    if (!rejectPendingId || !rejectConfirmed) return;
    await runAction(rejectPendingId, "reject");
  }

  async function handleConfirmCancel() {
    if (!cancelPendingId || !cancelConfirmed) return;
    await runAction(cancelPendingId, "cancel");
  }

  if (!open) return null;

  const chatOpen = Boolean(negotiateClaimId && activeNegotiateClaim);
  const subtitle =
    listLoading && claims.length === 0
      ? "Loading claims…"
      : hasDateFilter
        ? `${total} claim${total === 1 ? "" : "s"} in this date range.`
        : isOwner
          ? `${total} claim${total === 1 ? "" : "s"} waiting for your review.`
          : `${total} claim${total === 1 ? "" : "s"} on your profile.`;

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
        aria-labelledby={titleId}
        className={`relative w-full flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden max-h-[92vh] sm:max-h-[88vh] transition-[max-width] duration-300 ${
          chatOpen ? "sm:max-w-[min(96rem,98vw)]" : "sm:max-w-[min(72rem,96vw)]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2
              id={titleId}
              className="text-xl font-black text-green-900 dark:text-green-100"
            >
              {title}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {listingTitle ? (
                <>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {listingTitle}
                  </span>
                  {" · "}
                </>
              ) : null}
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Close"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Received from
              </span>
              <input
                type="date"
                value={dateFromInput}
                onChange={(e) => setDateFromInput(e.target.value)}
                disabled={listLoading}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Received to
              </span>
              <input
                type="date"
                value={dateToInput}
                onChange={(e) => setDateToInput(e.target.value)}
                disabled={listLoading}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
              />
            </label>
            <button
              type="button"
              onClick={applyDateFilter}
              disabled={listLoading}
              className="px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-primary text-white disabled:opacity-50"
            >
              Apply dates
            </button>
            {hasDateFilter ? (
              <button
                type="button"
                onClick={clearDateFilter}
                disabled={listLoading}
                className="px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 disabled:opacity-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={`flex flex-1 min-h-0 flex-col sm:flex-row sm:items-stretch ${
            chatOpen ? "min-h-[300px]" : ""
          }`}
        >
          <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-3 sm:px-6 py-4">
              {listLoading && claims.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-12">
                  Loading claims…
                </p>
              ) : claims.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-12">
                  {hasDateFilter
                    ? "No claims match this date range."
                    : isOwner
                      ? "No incoming claims right now."
                      : "You have no claims or proposals yet."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <table
                    className={`w-full text-left text-sm border-collapse ${
                      showListingColumn ? "min-w-[980px]" : "min-w-[880px]"
                    }`}
                  >
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/80 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {isOwner ? (
                          <th className="px-3 py-3 font-bold">Claimer</th>
                        ) : null}
                        <th className="px-3 py-3 font-bold">Type</th>
                        <th className="px-3 py-3 font-bold">Status</th>
                        <th className="px-3 py-3 font-bold">Negotiation</th>
                        <th className="px-3 py-3 font-bold">Message</th>
                        <th className="px-3 py-3 font-bold">Received</th>
                        {showListingColumn ? (
                          <th className="px-3 py-3 font-bold">Listing</th>
                        ) : null}
                        <th className="px-3 py-3 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {claims.map((claim) => {
                        const isExchange = claim.type === "exchange_proposal";
                        const offerTitle = claim.offeredItem?.title?.trim();
                        const busyThis = actingId === claim.id;
                        const reviewable =
                          isOwner &&
                          ["submitted", "pending"].includes(claim.status);
                        const canNegotiate = NEGOTIABLE_CLAIM_STATUSES.includes(
                          claim.status
                        );
                        const canCancel =
                          !isOwner &&
                          CANCELLABLE_STATUSES.includes(claim.status);
                        const rowActive =
                          String(negotiateClaimId) === String(claim.id);
                        const rejectPending = rejectPendingId === claim.id;
                        const cancelPending = cancelPendingId === claim.id;

                        return (
                          <tr
                            key={claim.id}
                            className={`transition-colors ${
                              rowActive
                                ? "bg-primary/5 dark:bg-primary/10"
                                : rejectPending || cancelPending
                                  ? "bg-red-50/80 dark:bg-red-950/20"
                                  : "bg-white dark:bg-zinc-900 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                            }`}
                          >
                            {isOwner ? (
                              <td className="px-3 py-3 font-medium text-green-900 dark:text-green-100 whitespace-nowrap">
                                {claimerName(claim)}
                              </td>
                            ) : null}
                            <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                              {claimTypeLabel(claim)}
                            </td>
                            <td className="px-3 py-3 capitalize text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                              {claim.status.replace(/_/g, " ")}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <NegotiationStatusCell
                                claim={claim}
                                modalOpen={open}
                                refreshKey={negotiationRefreshKey}
                                role={role}
                              />
                            </td>
                            <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 max-w-[180px]">
                              {claim.message ? (
                                <span
                                  className="line-clamp-2"
                                  title={claim.message}
                                >
                                  {claim.message}
                                </span>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                              {isExchange && offerTitle ? (
                                <span
                                  className="block text-xs text-zinc-500 mt-1 line-clamp-1"
                                  title={offerTitle}
                                >
                                  Offer: {offerTitle}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-zinc-500 whitespace-nowrap">
                              {formatDate(claim.createdAt)}
                            </td>
                            {showListingColumn ? (
                              <td className="px-3 py-3 max-w-[160px]">
                                {claim.listingId ? (
                                  <div className="space-y-1">
                                    {claim.listingTitle ? (
                                      <p
                                        className="text-xs font-medium text-zinc-700 dark:text-zinc-300 line-clamp-2"
                                        title={claim.listingTitle}
                                      >
                                        {claim.listingTitle}
                                      </p>
                                    ) : null}
                                    <Link
                                      to={{
                                        pathname: `/products/${claim.listingId}`,
                                        search: isOwner
                                          ? "?claims=owner"
                                          : "?claims=status",
                                      }}
                                      className="inline-flex items-center gap-0.5 font-bold text-primary hover:underline text-xs"
                                    >
                                      View
                                      <MaterialIcon
                                        name="arrow_forward"
                                        className="text-sm"
                                      />
                                    </Link>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            ) : null}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-nowrap items-center gap-2">
                                {reviewable ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busyThis || listLoading}
                                      onClick={() =>
                                        runAction(claim.id, "accept")
                                      }
                                      className={btnAccept}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busyThis || listLoading}
                                      onClick={() => handleRejectClick(claim.id)}
                                      className={btnReject}
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                                {canCancel ? (
                                  <button
                                    type="button"
                                    disabled={busyThis || listLoading}
                                    onClick={() => handleCancelClick(claim.id)}
                                    className={btnWithdraw}
                                  >
                                    Withdraw
                                  </button>
                                ) : null}
                                {canNegotiate ? (
                                  <button
                                    type="button"
                                    disabled={busyThis || listLoading}
                                    onClick={() => handleOpenNegotiate(claim)}
                                    className={`${btnNegotiate} ${
                                      rowActive
                                        ? "ring-2 ring-primary/40 bg-primary/15"
                                        : ""
                                    }`}
                                  >
                                    Negotiate
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {rejectPendingClaim ? (
              <div className="shrink-0 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-5 sm:px-6 py-4">
                <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-3">
                  Decline claim from {claimerName(rejectPendingClaim)}?
                </p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rejectConfirmed}
                    onChange={(e) => setRejectConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-800 dark:text-red-200 group-hover:text-red-900">
                    I confirm I want to decline this{" "}
                    {rejectPendingClaim.type === "exchange_proposal"
                      ? "exchange proposal"
                      : "give claim"}
                    . The claimer will be notified.
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    type="button"
                    disabled={!rejectConfirmed || actingId === rejectPendingId}
                    onClick={handleConfirmReject}
                    className="px-5 py-2.5 rounded-full font-bold text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actingId === rejectPendingId
                      ? "Declining…"
                      : "Confirm decline"}
                  </button>
                  <button
                    type="button"
                    disabled={actingId === rejectPendingId}
                    onClick={() => {
                      setRejectPendingId(null);
                      setRejectConfirmed(false);
                    }}
                    className="px-5 py-2.5 rounded-full font-bold text-sm text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {cancelPendingClaim ? (
              <div className="shrink-0 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-5 sm:px-6 py-4">
                <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-3">
                  Withdraw your{" "}
                  {cancelPendingClaim.type === "exchange_proposal"
                    ? "exchange proposal"
                    : "give claim"}
                  ?
                </p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={cancelConfirmed}
                    onChange={(e) => setCancelConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-800 dark:text-red-200 group-hover:text-red-900">
                    I confirm I want to withdraw this claim. The listing owner
                    will be notified.
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    type="button"
                    disabled={!cancelConfirmed || actingId === cancelPendingId}
                    onClick={handleConfirmCancel}
                    className="px-5 py-2.5 rounded-full font-bold text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actingId === cancelPendingId
                      ? "Withdrawing…"
                      : "Confirm withdraw"}
                  </button>
                  <button
                    type="button"
                    disabled={actingId === cancelPendingId}
                    onClick={() => {
                      setCancelPendingId(null);
                      setCancelConfirmed(false);
                    }}
                    className="px-5 py-2.5 rounded-full font-bold text-sm text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {chatOpen && activeNegotiateClaim ? (
            <div className="flex flex-col shrink-0 w-full sm:w-[24rem] border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-700 min-h-[260px] h-[36vh] sm:h-auto sm:min-h-[300px] sm:max-h-[calc(72vh-10rem)] overflow-hidden">
              <ProductClaimNegotiationChat
                claim={activeNegotiateClaim}
                open={true}
                variant="panel"
                closeOnEscape={false}
                onClose={closeNegotiateChat}
                onMessageSent={handleClaimAction}
              />
            </div>
          ) : null}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex flex-wrap items-center justify-between gap-4">
          {totalPages > 1 ? (
            <SkeuomorphicPagination
              page={page}
              totalPages={totalPages}
              total={total}
              loading={listLoading}
              onPageChange={goToPage}
            />
          ) : (
            <span className="text-sm text-zinc-500">
              {total > 0
                ? `${total} claim${total === 1 ? "" : "s"}`
                : "No claims"}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-bold text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
