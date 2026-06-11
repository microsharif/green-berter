import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProgressNavigate } from "../hooks/useNavigationProgress.js";
import { useUI } from "../context/UIContext.jsx";
import { createMembershipOrder } from "../api/membership.js";
import { ApiError } from "../api/client.js";
import {
  MEMBERSHIP_PLAN_DISPLAY,
  PAID_PLAN_KEYS,
  BANK_TRANSFER_DETAILS,
  formatListingLimit,
} from "../data/membershipPlans.js";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";

function BankRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2.5 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-zinc-800">{value}</span>
    </div>
  );
}

export default function MembershipCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useProgressNavigate();
  const { showToast } = useUI();

  const planKey = searchParams.get("plan");
  const plan = useMemo(
    () => (planKey ? MEMBERSHIP_PLAN_DISPLAY[planKey] : null),
    [planKey]
  );
  const isValidPaidPlan = Boolean(plan) && PAID_PLAN_KEYS.includes(planKey);

  const [form, setForm] = useState({
    accountName: "",
    senderReference: "",
    transferDate: "",
    note: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || !isValidPaidPlan) return;

    const nextErrors = {};
    if (!form.accountName.trim())
      nextErrors.accountName = "Enter the name on the sending account.";
    if (!form.senderReference.trim())
      nextErrors.senderReference =
        "Enter the transaction / reference number from your transfer.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = await createMembershipOrder({
        plan: planKey,
        bankTransfer: {
          accountName: form.accountName.trim(),
          senderReference: form.senderReference.trim(),
          transferDate: form.transferDate || undefined,
          note: form.note.trim() || undefined,
        },
      });
      const order = data?.order;
      showToast("Purchase request received.", "success");
      navigate(`/membership/receipt/${order.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors ?? {});
        const firstFieldMsg = err.fieldErrors
          ? Object.values(err.fieldErrors)[0]
          : null;
        showToast(firstFieldMsg ?? err.message, "error");
      } else {
        showToast("Could not submit your request. Try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isValidPaidPlan) {
    return (
      <main className="bg-[#fcf9f8] pt-32 pb-20 text-on-surface">
        <section className="mx-auto max-w-xl px-6 text-center">
          <MaterialIcon
            name="error_outline"
            className="text-5xl text-zinc-400"
          />
          <h1 className="mt-4 text-2xl font-black text-green-900">
            Choose a plan first
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            We couldn&apos;t find a paid plan to check out. Head back to the
            membership page and pick a plan.
          </p>
          <Link
            to="/membership"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:brightness-105"
          >
            View plans
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[#fcf9f8] pt-32 pb-20 text-on-surface">
      <section className="mx-auto max-w-5xl px-6">
        <Link
          to="/membership"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800"
        >
          <MaterialIcon name="chevron_left" className="text-base" />
          Back to plans
        </Link>

        <h1 className="mt-4 text-3xl font-black text-green-900 md:text-4xl">
          Checkout
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Complete your <strong>{plan.label}</strong> upgrade with a direct bank
          transfer.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Order summary + bank details */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                Order summary
              </h2>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-lg font-black text-green-900">
                  {plan.label}
                </span>
                <span className="text-lg font-black text-green-900">
                  {plan.priceLabel}
                  <span className="text-sm font-medium text-zinc-500">
                    {plan.period}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
                {formatListingLimit(plan.listingLimit)} listings
              </p>
              <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                {plan.benefits.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-zinc-700"
                  >
                    <MaterialIcon
                      name="check"
                      className="mt-0.5 text-base text-primary"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
                <MaterialIcon name="account_balance" className="text-base" />
                Transfer to this account
              </h2>
              <div className="mt-4">
                <BankRow label="Bank" value={BANK_TRANSFER_DETAILS.bankName} />
                <BankRow
                  label="Account name"
                  value={BANK_TRANSFER_DETAILS.accountName}
                />
                <BankRow
                  label="Account no."
                  value={BANK_TRANSFER_DETAILS.accountNumber}
                />
                <BankRow label="Branch" value={BANK_TRANSFER_DETAILS.branch} />
                <BankRow
                  label="Routing"
                  value={BANK_TRANSFER_DETAILS.routingNumber}
                />
                <BankRow label="Amount" value={plan.priceLabel} />
              </div>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                Transfer the exact amount, then fill in the form so we can match
                and verify your payment.
              </p>
            </div>
          </div>

          {/* Confirmation form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-3"
          >
            <h2 className="text-lg font-black text-green-900">
              Confirm your transfer
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Share your transfer details so our team can verify the payment.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="accountName"
                  className="text-xs font-bold uppercase tracking-wide text-zinc-500"
                >
                  Sender account name
                </label>
                <input
                  id="accountName"
                  type="text"
                  value={form.accountName}
                  onChange={(e) => update("accountName", e.target.value)}
                  placeholder="Name on the account you paid from"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.accountName ? (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.accountName}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="senderReference"
                  className="text-xs font-bold uppercase tracking-wide text-zinc-500"
                >
                  Transaction / reference number
                </label>
                <input
                  id="senderReference"
                  type="text"
                  value={form.senderReference}
                  onChange={(e) => update("senderReference", e.target.value)}
                  placeholder="e.g. TXN-9F3K21"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.senderReference ? (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.senderReference}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="transferDate"
                  className="text-xs font-bold uppercase tracking-wide text-zinc-500"
                >
                  Transfer date
                </label>
                <input
                  id="transferDate"
                  type="date"
                  value={form.transferDate}
                  onChange={(e) => update("transferDate", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.transferDate ? (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.transferDate}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="note"
                  className="text-xs font-bold uppercase tracking-wide text-zinc-500"
                >
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  rows={3}
                  value={form.note}
                  onChange={(e) => update("note", e.target.value)}
                  placeholder="Anything else we should know about this payment?"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-primary to-primary-container px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95 disabled:scale-100 disabled:opacity-70"
            >
              {submitting ? "Submitting…" : "Confirm purchase"}
            </button>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Submitting records your request. Your plan upgrades once we verify
              the bank transfer.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
