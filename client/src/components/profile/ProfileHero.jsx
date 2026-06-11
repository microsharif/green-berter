import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useProfilePage } from "../../context/ProfilePageContext.jsx";
import { fetchListings } from "../../api/listings.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import EditProfileModal from "./EditProfileModal.jsx";

const DEFAULT_TAGLINE = "Regenerative Pioneer";

function ListingStatCard({ label, value, icon, tone }) {
  const tones = {
    blue: {
      wrap: "bg-sky-100",
      icon: "text-sky-600",
    },
    orange: {
      wrap: "bg-orange-100",
      icon: "text-orange-500",
    },
    primary: {
      wrap: "bg-primary-fixed",
      icon: "text-on-primary-fixed",
    },
  };
  const colors = tones[tone] ?? tones.blue;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4 shadow-sm min-w-[220px]">
      <div
        className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${colors.wrap}`}
      >
        <MaterialIcon name={icon} className={`text-2xl ${colors.icon}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </p>
        <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 leading-none mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * DFD §3 — Profile shell: name, contact fields, listing analytics, and actions.
 */
export default function ProfileHero() {
  const { user } = useAuth();
  const { activeSection } = useProfilePage();
  const [editOpen, setEditOpen] = useState(false);
  const [totalListings, setTotalListings] = useState(null);
  const [pendingListings, setPendingListings] = useState(null);
  const displayName = user?.fullName?.trim() || "Member";
  const locationLine = user?.address?.trim()
    ? `${DEFAULT_TAGLINE} · ${user.address.trim()}`
    : DEFAULT_TAGLINE;

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [all, pending] = await Promise.all([
        fetchListings({ ownerUserId: user.id, limit: 1 }),
        fetchListings({ ownerUserId: user.id, status: "pending", limit: 1 }),
      ]);
      setTotalListings(all.total ?? 0);
      setPendingListings(pending.total ?? 0);
    } catch {
      setTotalListings(0);
      setPendingListings(0);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, activeSection]);

  const statValue = (count) =>
    count === null ? "—" : String(count);

  return (
    <section
      id="profile-dashboard"
      className="scroll-mt-24 relative bg-surface-container-low rounded-3xl p-8 md:p-12 overflow-hidden flex flex-col md:flex-row justify-between items-stretch md:items-end gap-8"
    >
      <div className="relative z-10 flex flex-col gap-6 max-w-xl">
        <div className="space-y-2">
          <span className="hero-enter inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed text-xs font-bold rounded-full tracking-wider uppercase">
            Verified Member
          </span>
          <h1 className="hero-enter hero-enter-delay-1 text-5xl md:text-6xl font-black text-green-900 tracking-tighter leading-none">
            {displayName}
          </h1>
          <p className="hero-enter hero-enter-delay-2 text-xl text-on-surface-variant font-medium">
            {locationLine}
          </p>
          {user?.phone?.trim() ? (
            <p className="hero-enter hero-enter-delay-3 text-sm text-on-surface-variant/90">
              Phone · {user.phone.trim()}
            </p>
          ) : null}
          {user?.email?.trim() ? (
            <p className="hero-enter hero-enter-delay-3 text-sm text-on-surface-variant/90">
              Email · {user.email.trim()}
            </p>
          ) : null}
        </div>
        <div className="hero-enter hero-enter-delay-4 flex gap-3 sm:gap-4 flex-wrap items-center">
          <Link
            to="/upload?mode=give"
            className="px-8 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 transition-all active:scale-95 inline-block text-center"
          >
            Give Item
          </Link>
          <Link
            to="/upload?mode=exchange"
            className="px-8 py-3 rounded-full font-bold shadow-sm transition-all hover:brightness-95 active:scale-[0.98] inline-block text-center bg-[#3b9eed] hover:bg-[#2f8fdb] text-[#0f172a]"
          >
            Start Exchange
          </Link>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="px-8 py-3 bg-white text-green-800 font-bold border border-green-800/10 rounded-full transition-all hover:bg-zinc-50"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-4 w-full md:w-auto shrink-0">
        <RevealOnScroll delay={180}>
          <ListingStatCard
            label="Total Listings"
            value={statValue(totalListings)}
            icon="assignment_turned_in"
            tone="blue"
          />
        </RevealOnScroll>
        <RevealOnScroll delay={260}>
          <ListingStatCard
            label="Pending Listings"
            value={statValue(pendingListings)}
            icon="pending_actions"
            tone="primary"
          />
        </RevealOnScroll>
      </div>

      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </section>
  );
}
