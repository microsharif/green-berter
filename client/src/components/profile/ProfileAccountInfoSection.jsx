import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchListings } from "../../api/listings.js";
import { fetchMyMembershipOrders } from "../../api/membership.js";
import {
  getPlanDisplay,
  formatListingLimit,
} from "../../data/membershipPlans.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortMemberId(id) {
  if (!id) return "—";
  const value = String(id);
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function statusLabel(status) {
  const value = String(status ?? "active").replace(/_/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function InfoRow({ label, value, mono = false, layout = "vertical" }) {
  const isHorizontal = layout === "horizontal";
  return (
    <div
      className={
        isHorizontal
          ? "min-w-0"
          : "py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
      }
    >
      <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-zinc-800 dark:text-zinc-200 break-words ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

/**
 * Account details for the signed-in member — contact, verification, and membership.
 */
export default function ProfileAccountInfoSection() {
  const { user } = useAuth();
  const [ownedCount, setOwnedCount] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [listingRes, orderRes] = await Promise.all([
          fetchListings({ ownerUserId: userId, limit: 1 }),
          fetchMyMembershipOrders(),
        ]);
        if (cancelled) return;
        setOwnedCount(listingRes.total ?? 0);
        const orders = Array.isArray(orderRes?.orders) ? orderRes.orders : [];
        setPendingOrder(orders.find((o) => o.status === "pending") ?? null);
      } catch {
        /* non-critical — leave usage/pending unknown on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!user) return null;

  const plan = getPlanDisplay(user.membership?.plan);
  const limit = plan.listingLimit;
  const usageLabel =
    ownedCount == null
      ? `— / ${formatListingLimit(limit)}`
      : `${ownedCount} / ${formatListingLimit(limit)}`;
  const pendingPlan = pendingOrder ? getPlanDisplay(pendingOrder.plan) : null;

  return (
    <RevealOnScroll as="section" id="profile-account" className="scroll-mt-24 space-y-8 pt-12">
      <div>
        <h2 className="text-2xl font-black text-green-900 dark:text-green-100">
          Account info
        </h2>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
          Your membership details, contact information, and account status on
          The Regenerative Exchange.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevealOnScroll delay={80}>
          <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-6 h-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
              <MaterialIcon name="contact_page" />
              Contact details
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary shrink-0">
              <MaterialIcon name="verified" className="text-sm" />
              Verified member
            </span>
          </div>
          <dl>
            <InfoRow label="Full name" value={user.fullName} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Address" value={user.address} />
          </dl>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={140}>
          <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-6 h-full">
          <h3 className="font-bold text-green-900 dark:text-green-100 flex items-center gap-2 mb-2">
            <MaterialIcon name="shield" />
            Security & sign-in
          </h3>
          <dl>
            <InfoRow
              label="Email verification"
              value={user.emailVerified ? "Verified" : "Not verified yet"}
            />
            <InfoRow
              label="Last sign-in"
              value={formatDateTime(user.lastLoginAt)}
            />
            <InfoRow
              label="Password"
              value="Managed via Edit profile — change password when needed"
            />
          </dl>
          <p className="text-xs text-zinc-500 mt-4">
            Sessions use secure httpOnly cookies. Sign out from the top navigation
            when using a shared device.
          </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={200} className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-6 h-full flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
              <MaterialIcon name="workspace_premium" />
              Membership
            </h3>
            <Link
              to="/membership"
              className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
            >
              {plan.key === "sun" ? "Manage" : "Upgrade"}
            </Link>
          </div>

          {pendingOrder ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <MaterialIcon name="schedule" className="text-sm mt-0.5" />
              <span>
                Your <strong>{pendingPlan?.label}</strong> upgrade is awaiting
                verification of your bank transfer.{" "}
                <Link
                  to={`/membership/receipt/${pendingOrder.id}`}
                  className="font-bold underline"
                >
                  View receipt
                </Link>
              </span>
            </div>
          ) : null}

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-6">
            <InfoRow layout="horizontal" label="Current plan" value={plan.label} />
            <InfoRow
              layout="horizontal"
              label="Plan status"
              value={statusLabel(user.membership?.status)}
            />
            <InfoRow layout="horizontal" label="Listings used" value={usageLabel} />
            <InfoRow
              layout="horizontal"
              label="Member ID"
              value={shortMemberId(user.id)}
              mono
            />
            <InfoRow
              layout="horizontal"
              label="Account status"
              value={statusLabel(user.status)}
            />
            <InfoRow
              layout="horizontal"
              label="Member since"
              value={formatDate(user.createdAt)}
            />
            {user.membership?.expiresAt ? (
              <InfoRow
                layout="horizontal"
                label="Plan renews"
                value={formatDate(user.membership.expiresAt)}
              />
            ) : null}
          </dl>
          </div>
        </RevealOnScroll>
      </div>
    </RevealOnScroll>
  );
}
