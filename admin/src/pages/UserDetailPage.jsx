import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { changeUserStatus, fetchUser } from "../api/users.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import PermissionGate from "../components/auth/PermissionGate.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Badge from "../components/ui/Badge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { PageLoader } from "../components/ui/Spinner.jsx";
import EditUserModal from "../components/users/EditUserModal.jsx";
import { formatDateTime, formatNumber, titleCase } from "../utils/format.js";

// action → { label, tone, available-when-status }
const STATUS_ACTIONS = [
  { action: "activate", label: "Activate", icon: "check_circle", tone: "primary", hideWhen: ["active"] },
  { action: "deactivate", label: "Deactivate", icon: "block", tone: "ghost", hideWhen: ["disabled"] },
  { action: "suspend", label: "Suspend", icon: "pause_circle", tone: "ghost", hideWhen: ["suspended"] },
  { action: "ban", label: "Ban", icon: "gavel", tone: "danger", hideWhen: ["banned"] },
];

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

export default function UserDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { hasPermission } = useAdminAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchUser(id)
      .then(setData)
      .catch((err) => toast.error(err.message ?? "Failed to load user."))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const runStatusAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      const res = await changeUserStatus(id, pendingAction.action);
      setData((prev) => ({ ...prev, user: res.user }));
      toast.success(res.message ?? "Status updated.");
      setPendingAction(null);
      load();
    } catch (err) {
      toast.error(err.message ?? "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageLoader label="Loading user…" />;
  if (!data) return null;

  const { user, stats, activity } = data;
  const canWrite = hasPermission(PERMISSIONS.USERS_WRITE);

  return (
    <div>
      <PageHeader
        title={user.fullName}
        trail={[{ label: "Users", to: "/users" }, { label: user.fullName }]}
        actions={
          canWrite ? (
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => setEditing(true)}
            >
              <MaterialIcon name="edit" className="text-[18px]" />
              Edit
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile column */}
        <div className="space-y-4 lg:col-span-1">
          <div className="admin-card p-6 text-center">
            <div className="flex justify-center">
              <Avatar name={user.fullName} src={user.profileImageUrl} size={88} />
            </div>
            <h2 className="mt-3 font-display text-xl font-bold text-ink">
              {user.fullName}
            </h2>
            <p className="text-sm text-ink-faint">{user.email}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge value={user.status} />
              <span className="text-xs capitalize text-ink-soft">
                {user.membership?.plan ?? "free"} plan
              </span>
            </div>
          </div>

          <PermissionGate permission={PERMISSIONS.USERS_WRITE}>
            <div className="admin-card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Account actions
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS.filter(
                  (a) => !a.hideWhen.includes(user.status)
                ).map((a) => (
                  <button
                    key={a.action}
                    type="button"
                    onClick={() => setPendingAction(a)}
                    className={
                      a.tone === "danger"
                        ? "admin-btn-danger"
                        : a.tone === "primary"
                          ? "admin-btn-primary"
                          : "admin-btn-ghost"
                    }
                  >
                    <MaterialIcon name={a.icon} className="text-[18px]" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </PermissionGate>
        </div>

        {/* Details column */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Listings" value={formatNumber(stats.totalListings)} icon="inventory_2" />
            <StatCard label="Active" value={formatNumber(stats.activeListings)} icon="sell" tone="info" />
            <StatCard label="Completed" value={formatNumber(stats.completedListings)} icon="task_alt" />
            <StatCard label="Claims Made" value={formatNumber(stats.claimsMade)} icon="front_hand" tone="info" />
            <StatCard label="Claims Received" value={formatNumber(stats.claimsReceived)} icon="inbox" tone="warning" />
          </div>

          <div className="admin-card p-6">
            <h3 className="mb-2 font-display text-base font-bold text-ink">
              Profile details
            </h3>
            <InfoRow label="Full name" value={user.fullName} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Address" value={user.address} />
            <InfoRow label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
            <InfoRow label="Membership" value={`${titleCase(user.membership?.plan ?? "free")} (${titleCase(user.membership?.status ?? "active")})`} />
            <InfoRow label="Last login" value={formatDateTime(user.lastLoginAt)} />
            <InfoRow label="Joined" value={formatDateTime(user.createdAt)} />
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-surface-border px-6 py-4">
              <h3 className="font-display text-base font-bold text-ink">
                Activity history
              </h3>
            </div>
            <ul className="divide-y divide-surface-border">
              {activity.length === 0 ? (
                <li className="px-6 py-6 text-center text-sm text-ink-faint">
                  No recorded activity for this user.
                </li>
              ) : (
                activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-ink-soft">
                      <MaterialIcon name="history" className="text-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {titleCase(a.action)}
                        {a.newState?.status
                          ? ` → ${titleCase(a.newState.status)}`
                          : ""}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {formatDateTime(a.createdAt)}
                        {a.metadata?.actorEmail
                          ? ` · by ${a.metadata.actorEmail}`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {editing ? (
        <EditUserModal
          open={editing}
          user={user}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setData((prev) => ({ ...prev, user: updated }));
            setEditing(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={`${pendingAction?.label ?? ""} user`}
        message={`Are you sure you want to ${pendingAction?.label?.toLowerCase()} ${user.fullName}? ${
          pendingAction && pendingAction.action !== "activate"
            ? "Their active sessions will be revoked."
            : ""
        }`}
        confirmLabel={pendingAction?.label ?? "Confirm"}
        tone={pendingAction?.tone === "danger" ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={runStatusAction}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
}
