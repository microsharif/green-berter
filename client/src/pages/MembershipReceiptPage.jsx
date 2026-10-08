import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMembershipOrder } from "../api/membership.js";
import { getPlanDisplay } from "../data/membershipPlans.js";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";

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

function formatBdt(amount) {
  if (amount == null) return "—";
  return `BDT ${Number(amount).toLocaleString()}`;
}

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

function ReceiptRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span
        className={`text-right text-sm font-semibold text-zinc-800 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function MembershipReceiptPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await fetchMembershipOrder(orderId);
        if (!cancelled) setOrder(data?.order ?? null);
      } catch {
        if (!cancelled) setError("We couldn't load this receipt.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className="bg-[#fcf9f8] pt-10 pb-20 text-on-surface">
        <section className="mx-auto max-w-2xl px-6 text-center text-sm text-zinc-500">
          Loading your receipt…
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="bg-[#fcf9f8] pt-10 pb-20 text-on-surface">
        <section className="mx-auto max-w-xl px-6 text-center">
          <MaterialIcon
            name="error_outline"
            className="text-5xl text-zinc-400"
          />
          <h1 className="mt-4 text-2xl font-black text-green-900">
            Receipt not found
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {error ?? "This order does not exist or is not yours."}
          </p>
          <Link
            to="/membership"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:brightness-105"
          >
            Back to membership
          </Link>
        </section>
      </main>
    );
  }

  const plan = getPlanDisplay(order.plan);

  return (
    <main className="bg-[#fcf9f8] pt-10 pb-20 text-on-surface">
      <section className="mx-auto max-w-2xl px-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <MaterialIcon name="task_alt" className="text-3xl" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-green-900">
              Thank you — request received!
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
              We&apos;ve recorded your <strong>{plan.label}</strong> purchase
              request. Our team will verify your bank transfer and activate your
              membership shortly. You&apos;ll keep your current plan until then.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                STATUS_BADGE[order.status] ?? STATUS_BADGE.pending
              }`}
            >
              <MaterialIcon name="schedule" className="text-sm" />
              {order.status === "pending"
                ? "Awaiting verification"
                : order.status}
            </span>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Order details
            </h2>
            <div className="mt-2">
              <ReceiptRow label="Order ID" value={order.id} mono />
              <ReceiptRow label="Plan" value={plan.label} />
              <ReceiptRow label="Amount" value={formatBdt(order.amountBdt)} />
              <ReceiptRow label="Payment method" value="Direct bank transfer" />
              <ReceiptRow
                label="Requested on"
                value={formatDate(order.createdAt)}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Your transfer details
            </h2>
            <div className="mt-2">
              <ReceiptRow
                label="Sender name"
                value={order.bankTransfer?.accountName}
              />
              <ReceiptRow
                label="Reference"
                value={order.bankTransfer?.senderReference}
                mono
              />
              <ReceiptRow
                label="Transfer date"
                value={formatDate(order.bankTransfer?.transferDate)}
              />
              {order.bankTransfer?.note ? (
                <ReceiptRow label="Note" value={order.bankTransfer.note} />
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/profile#account"
              className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-bold text-white shadow-md shadow-primary/20 hover:brightness-105"
            >
              View my membership
            </Link>
            <Link
              to="/products"
              className="flex-1 rounded-full border border-zinc-200 px-6 py-3 text-center text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
