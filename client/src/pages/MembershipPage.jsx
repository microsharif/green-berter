import { useLocation } from "react-router-dom";
import { useProgressNavigate } from "../hooks/useNavigationProgress.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  MEMBERSHIP_PLAN_DISPLAY,
  MEMBERSHIP_PLAN_ORDER,
  formatListingLimit,
} from "../data/membershipPlans.js";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import RevealOnScroll from "../components/ui/RevealOnScroll.jsx";

const ACCENT_RING = {
  zinc: "border-zinc-200",
  lime: "border-lime-300",
  sky: "border-sky-300",
  amber: "border-amber-300 ring-2 ring-amber-200",
};

const ACCENT_ICON = {
  zinc: "bg-zinc-100 text-zinc-600",
  lime: "bg-lime-100 text-lime-700",
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-700",
};

function PlanCard({ plan, isCurrent, onChoose }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-3xl border bg-white p-7 shadow-sm transition-all hover:shadow-md ${
        ACCENT_RING[plan.accent] ?? ACCENT_RING.zinc
      }`}
    >
      {isCurrent ? (
        <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow">
          <MaterialIcon name="check_circle" className="text-sm" />
          Current plan
        </span>
      ) : null}

      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
          ACCENT_ICON[plan.accent] ?? ACCENT_ICON.zinc
        }`}
      >
        <MaterialIcon name={plan.icon} />
      </div>

      <h3 className="text-xl font-black text-green-900">{plan.label}</h3>
      <p className="mt-1 text-sm text-zinc-500">{plan.tagline}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-black text-green-900">
          {plan.priceLabel}
        </span>
        {plan.period ? (
          <span className="text-sm font-medium text-zinc-500">
            {plan.period}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
        {formatListingLimit(plan.listingLimit)} listings
      </p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-zinc-700">
            <MaterialIcon
              name="check"
              className="mt-0.5 text-base text-primary"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={isCurrent || plan.key === "free"}
        onClick={() => onChoose(plan)}
        className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-bold transition-all active:scale-[0.98] ${
          isCurrent || plan.key === "free"
            ? "cursor-default bg-zinc-100 text-zinc-400"
            : "bg-primary text-white shadow-md shadow-primary/20 hover:brightness-105"
        }`}
      >
        {isCurrent
          ? "Your current plan"
          : plan.key === "free"
            ? "Default plan"
            : "Choose plan"}
      </button>
    </div>
  );
}

export default function MembershipPage() {
  const navigate = useProgressNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const currentPlan = user?.membership?.plan ?? "free";

  function handleChoose(plan) {
    if (plan.key === "free") return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    navigate(`/membership/checkout?plan=${plan.key}`);
  }

  return (
    <main className="bg-[#fcf9f8] pt-10 pb-20 text-on-surface">
      <section className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="hero-enter inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <MaterialIcon name="workspace_premium" className="text-sm" />
            Membership
          </span>
          <h1 className="hero-enter hero-enter-delay-1 mt-4 font-headline text-4xl font-black text-green-900 md:text-5xl">
            Become a Green Barter member
          </h1>
          <p className="hero-enter hero-enter-delay-2 mt-4 text-base text-zinc-600">
            Support a regenerative economy and unlock more posting power. Every
            new account starts on the Free plan — upgrade any time via direct
            bank transfer.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MEMBERSHIP_PLAN_ORDER.map((key, index) => {
            const plan = MEMBERSHIP_PLAN_DISPLAY[key];
            return (
              <RevealOnScroll key={key} delay={120 + index * 80} className="h-full">
                <PlanCard
                  plan={plan}
                  isCurrent={currentPlan === key}
                  onChoose={handleChoose}
                />
              </RevealOnScroll>
            );
          })}
        </div>

        <RevealOnScroll delay={480} className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-xs text-zinc-500">
            Paid plans are billed yearly. Payment is currently accepted via direct
            bank transfer only; your upgrade is activated once we verify the
            transfer.
          </p>
        </RevealOnScroll>
      </section>
    </main>
  );
}
