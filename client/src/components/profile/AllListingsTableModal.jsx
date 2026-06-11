import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { deleteListing, fetchListings } from "../../api/listings.js";
import { ApiError } from "../../api/client.js";
import { useUI } from "../../context/UIContext.jsx";
import { apiListingToCatalogProduct } from "../../data/listingAdapter.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import SkeuomorphicPagination from "../ui/SkeuomorphicPagination.jsx";
import EditListingForm from "./EditListingForm.jsx";
import { exchangePriceLabel, isGive } from "../products/productUtils.js";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "give", label: "Give" },
  { value: "exchange", label: "Exchange" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const selectClass =
  "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 min-w-[9rem]";

/** Items per page. */
const PAGE_SIZE = 20;

function formatDate(product) {
  const raw = product?._api?.createdAt;
  if (!raw) return product?.postedAgo ?? "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status) {
  const value = String(status ?? "available").replace(/_/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * All of the current user's listings in a table (profile Active Listings tab).
 * Listings are fetched from the API per page: offset = page * PAGE_SIZE.
 */
export default function AllListingsTableModal({
  open,
  onClose,
  ownerUserId,
  onSaved,
  onDeleted,
}) {
  const titleId = useId();
  const { showToast } = useUI();

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageRows, setPageRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [deletePendingId, setDeletePendingId] = useState(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = Boolean(
    typeFilter || statusFilter || appliedSearch
  );

  const resetTransient = useCallback(() => {
    setDeletePendingId(null);
    setDeleteConfirmed(false);
    setDeletingId(null);
  }, []);

  const reloadList = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  const deletePendingProduct = useMemo(
    () => pageRows.find((p) => p.id === deletePendingId) ?? null,
    [pageRows, deletePendingId]
  );

  useEffect(() => {
    if (!open) {
      resetTransient();
      setEditingProduct(null);
      setPage(0);
      setSearchQuery("");
      setAppliedSearch("");
      setTypeFilter("");
      setStatusFilter("");
      setPageRows([]);
      setTotal(0);
    }
  }, [open, resetTransient]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, open]);

  useEffect(() => {
    if (!open) return;
    setPage(0);
  }, [typeFilter, statusFilter, appliedSearch, open]);

  useEffect(() => {
    if (!open || !ownerUserId) return undefined;
    let cancelled = false;

    (async () => {
      setListLoading(true);
      try {
        const res = await fetchListings({
          ownerUserId,
          listingType: typeFilter || undefined,
          status: statusFilter || undefined,
          search: appliedSearch || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (cancelled) return;

        setPageRows(
          res.listings.map(apiListingToCatalogProduct).filter(Boolean)
        );
        setTotal(res.total);

        const maxPage = Math.max(0, Math.ceil(res.total / PAGE_SIZE) - 1);
        if (page > maxPage) {
          setPage(maxPage);
        }
      } catch (err) {
        if (cancelled) return;
        showToast(
          err instanceof ApiError
            ? err.message
            : "Could not load listings.",
          "error"
        );
        setPageRows([]);
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
    ownerUserId,
    page,
    typeFilter,
    statusFilter,
    appliedSearch,
    reloadToken,
    showToast,
  ]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        if (editingProduct) {
          setEditingProduct(null);
          return;
        }
        if (deletePendingId) {
          resetTransient();
          return;
        }
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, deletePendingId, editingProduct, resetTransient]);

  function openEdit(product) {
    resetTransient();
    setEditingProduct(product);
  }

  function closeEdit() {
    setEditingProduct(null);
  }

  async function handleListingSaved(updated) {
    reloadList();
    await onSaved?.(updated);
    await onDeleted?.();
  }

  function clearFilters() {
    setSearchQuery("");
    setAppliedSearch("");
    setTypeFilter("");
    setStatusFilter("");
  }

  function startDelete(product) {
    setDeletePendingId(product.id);
    setDeleteConfirmed(false);
  }

  async function handleConfirmDelete() {
    if (!deletePendingId || !deleteConfirmed) return;

    setDeletingId(deletePendingId);
    try {
      await deleteListing(deletePendingId);
      showToast("Listing deleted.", "success");
      resetTransient();
      reloadList();
      await onDeleted?.();
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : "Could not delete this listing.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  const editOpen = Boolean(editingProduct);

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
          editOpen ? "sm:max-w-[min(96rem,98vw)]" : "sm:max-w-[min(72rem,96vw)]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2
              id={titleId}
              className="text-xl font-black text-green-900 dark:text-green-100"
            >
              All listings
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {listLoading && pageRows.length === 0
                ? "Loading listings…"
                : hasActiveFilters
                  ? `${total} matching listing${total === 1 ? "" : "s"}.`
                  : `${total} listing${total === 1 ? "" : "s"} on your profile.`}
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
            <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Search by title
              </span>
              <div className="relative">
                <MaterialIcon
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-lg pointer-events-none"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search listings…"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-10 pr-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Type
              </span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                disabled={listLoading}
                className={selectClass}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value || "all-types"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={listLoading}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value || "all-statuses"}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                disabled={listLoading}
                className="px-4 py-2 rounded-full font-bold text-xs sm:text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 disabled:opacity-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={`flex flex-1 min-h-0 flex-col sm:flex-row sm:items-stretch ${
            editOpen ? "min-h-[380px]" : ""
          }`}
        >
          <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-3 sm:px-6 py-4">
          {listLoading && pageRows.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12">
              Loading listings…
            </p>
          ) : total === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12">
              {hasActiveFilters
                ? "No listings match your search or filters."
                : "You haven't posted anything yet."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full min-w-[980px] text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/80 text-xs font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-3 font-bold w-16">Photo</th>
                    <th className="px-3 py-3 font-bold">Title</th>
                    <th className="px-3 py-3 font-bold">Type</th>
                    <th className="px-3 py-3 font-bold">Price</th>
                    <th className="px-3 py-3 font-bold">Location</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-3 py-3 font-bold">Posted</th>
                    <th className="px-3 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pageRows.map((product) => {
                    const give = isGive(product.listingType);
                    const priceLabel = exchangePriceLabel(product);
                    const deletePending = deletePendingId === product.id;
                    const rowActive =
                      editOpen && String(editingProduct?.id) === String(product.id);

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          rowActive
                            ? "bg-primary/5 dark:bg-primary/10"
                            : deletePending
                            ? "bg-red-50/80 dark:bg-red-950/20"
                            : "bg-white dark:bg-zinc-900 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover bg-zinc-100"
                          />
                        </td>
                        <td className="px-3 py-3 font-medium text-green-900 dark:text-green-100 max-w-[200px]">
                          <Link
                            to={`/products/${product.id}`}
                            className="line-clamp-2 hover:underline"
                            onClick={onClose}
                          >
                            {product.title}
                          </Link>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              give
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/10 text-secondary"
                            }`}
                          >
                            {give ? "FREE" : "EXCHANGE"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap tabular-nums">
                          {priceLabel ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 max-w-[140px]">
                          <span className="line-clamp-2" title={product.location}>
                            {product.location}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap capitalize">
                          {statusLabel(product.status)}
                        </td>
                        <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(product)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              disabled={Boolean(deletingId)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 ${
                                rowActive ? "ring-2 ring-primary/40" : ""
                              }`}
                            >
                              <MaterialIcon name="edit" className="text-sm" />
                              Edit
                            </button>
                            <Link
                              to={`/products/${product.id}`}
                              onClick={onClose}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs bg-primary/10 text-primary hover:bg-primary/15 transition-all active:scale-[0.98]"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => startDelete(product)}
                              disabled={Boolean(deletingId)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs bg-red-600/10 text-red-700 hover:bg-red-600/15 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                              <MaterialIcon name="delete" className="text-sm" />
                              Delete
                            </button>
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

        {deletePendingProduct ? (
          <div className="shrink-0 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-5 sm:px-6 py-4">
            <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-3">
              Delete &ldquo;{deletePendingProduct.title}&rdquo;?
            </p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-red-800 dark:text-red-200 group-hover:text-red-900">
                I confirm I want to permanently delete this listing. This action
                cannot be undone.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                type="button"
                disabled={!deleteConfirmed || deletingId === deletePendingId}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-full font-bold text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === deletePendingId
                  ? "Deleting…"
                  : "Confirm delete"}
              </button>
              <button
                type="button"
                disabled={deletingId === deletePendingId}
                onClick={resetTransient}
                className="px-5 py-2.5 rounded-full font-bold text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
          </div>

          {editOpen && editingProduct ? (
            <div className="flex flex-col shrink-0 w-full sm:w-[min(34rem,100%)] border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-700 min-h-[380px] h-[58vh] sm:h-auto sm:min-h-[380px] sm:max-h-[calc(80vh-6rem)] overflow-hidden">
              <EditListingForm
                product={editingProduct}
                onClose={closeEdit}
                onSaved={handleListingSaved}
                closeOnEscape={false}
              />
            </div>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <div className="px-5 sm:px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex justify-center">
            <SkeuomorphicPagination
              page={page}
              totalPages={totalPages}
              total={total}
              loading={listLoading}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
