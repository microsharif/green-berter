import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  changeListingStatus,
  deleteListing,
  fetchListing,
} from "../api/listings.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import PermissionGate from "../components/auth/PermissionGate.jsx";
import Badge from "../components/ui/Badge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { PageLoader } from "../components/ui/Spinner.jsx";
import EditListingModal from "../components/listings/EditListingModal.jsx";
import {
  formatBdt,
  formatDateTime,
  resolveMediaUrl,
  titleCase,
} from "../utils/format.js";

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-surface-border py-3 last:border-0 sm:flex-row sm:items-center">
      <span className="w-40 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span className="text-sm text-ink">{value || "—"}</span>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAdminAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchListing(id)
      .then(setData)
      .catch((err) => toast.error(err.message ?? "Failed to load listing."))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const runConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.kind === "delete") {
        await deleteListing(id);
        toast.success("Listing deleted.");
        navigate("/listings", { replace: true });
        return;
      }
      const res = await changeListingStatus(id, confirm.action);
      setData((prev) => ({ ...prev, listing: res.listing }));
      toast.success(res.message ?? "Listing updated.");
      setConfirm(null);
    } catch (err) {
      toast.error(err.message ?? "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageLoader label="Loading listing…" />;
  if (!data) return null;

  const { listing, owner, claims } = data;
  const canWrite = hasPermission(PERMISSIONS.LISTINGS_WRITE);
  const heroImage = resolveMediaUrl(listing.imageUrl);

  return (
    <div>
      <PageHeader
        title={listing.title}
        trail={[{ label: "Listings", to: "/listings" }, { label: listing.title }]}
        actions={
          canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              {listing.status === "pending" ? (
                <>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={() =>
                      setConfirm({
                        kind: "status",
                        action: "approve",
                        title: "Approve listing",
                        message: "Approve this listing and make it available?",
                        tone: "primary",
                        label: "Approve",
                      })
                    }
                  >
                    <MaterialIcon name="check_circle" className="text-[18px]" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={() =>
                      setConfirm({
                        kind: "status",
                        action: "reject",
                        title: "Reject listing",
                        message: "Reject this listing? It will be hidden from browse.",
                        tone: "danger",
                        label: "Reject",
                      })
                    }
                  >
                    <MaterialIcon name="block" className="text-[18px]" />
                    Reject
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="admin-btn-ghost"
                onClick={() => setEditing(true)}
              >
                <MaterialIcon name="edit" className="text-[18px]" />
                Edit
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={() =>
                  setConfirm({
                    kind: "delete",
                    title: "Delete listing",
                    message: "Permanently delete this listing? This cannot be undone.",
                    tone: "danger",
                    label: "Delete",
                  })
                }
              >
                <MaterialIcon name="delete" className="text-[18px]" />
                Delete
              </button>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Media + meta */}
        <div className="space-y-4 lg:col-span-1">
          <div className="admin-card overflow-hidden">
            {heroImage ? (
              <img
                src={heroImage}
                alt={listing.title}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-surface-muted text-ink-faint">
                <MaterialIcon name="image" className="text-[48px]" />
              </div>
            )}
            <div className="flex items-center justify-between p-4">
              <Badge value={listing.listingType} />
              <Badge value={listing.status} />
            </div>
          </div>

          {owner ? (
            <div className="admin-card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Owner
              </p>
              <div className="flex items-center gap-3">
                <Avatar name={owner.fullName} src={owner.profileImageUrl} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {owner.fullName}
                  </p>
                  <p className="truncate text-xs text-ink-faint">{owner.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/users/${owner.id}`)}
                className="admin-btn-ghost mt-3 w-full"
              >
                View owner profile
              </button>
            </div>
          ) : null}
        </div>

        {/* Details + history */}
        <div className="space-y-4 lg:col-span-2">
          <div className="admin-card p-6">
            <h3 className="mb-2 font-display text-base font-bold text-ink">
              Listing details
            </h3>
            <InfoRow label="Title" value={listing.title} />
            <InfoRow label="Type" value={titleCase(listing.listingType)} />
            <InfoRow label="Status" value={titleCase(listing.status)} />
            <InfoRow label="Category" value={listing.categoryPath || listing.categoryName} />
            <InfoRow label="Location" value={listing.location} />
            {listing.listingType === "exchange" ? (
              <>
                <InfoRow
                  label="Reference price"
                  value={
                    listing.exchange?.referencePrice != null
                      ? formatBdt(listing.exchange.referencePrice)
                      : "—"
                  }
                />
                <InfoRow
                  label="Wants"
                  value={(listing.exchange?.desiredItems ?? []).join(", ")}
                />
              </>
            ) : null}
            <InfoRow label="Created" value={formatDateTime(listing.createdAt)} />
            <InfoRow label="Updated" value={formatDateTime(listing.updatedAt)} />
          </div>

          <div className="admin-card p-6">
            <h3 className="mb-2 font-display text-base font-bold text-ink">
              Story
            </h3>
            <p className="whitespace-pre-line text-sm text-ink-soft">
              {listing.story}
            </p>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-surface-border px-6 py-4">
              <h3 className="font-display text-base font-bold text-ink">
                Claims &amp; swap history ({claims.length})
              </h3>
            </div>
            <ul className="divide-y divide-surface-border">
              {claims.length === 0 ? (
                <li className="px-6 py-6 text-center text-sm text-ink-faint">
                  No claims on this listing yet.
                </li>
              ) : (
                claims.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-6 py-3">
                    <Avatar
                      name={c.claimer?.fullName}
                      src={c.claimer?.profileImageUrl}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {c.claimer?.fullName ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {titleCase(c.type)} · {formatDateTime(c.createdAt)}
                      </p>
                    </div>
                    <Badge value={c.status} />
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {editing ? (
        <EditListingModal
          open={editing}
          listing={listing}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setData((prev) => ({ ...prev, listing: updated }));
            setEditing(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.label ?? "Confirm"}
        tone={confirm?.tone === "danger" ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
