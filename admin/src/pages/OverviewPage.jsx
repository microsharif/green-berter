import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGrowth, fetchOverview, fetchRecent } from "../api/analytics.js";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/layout/PageHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import GrowthChart from "../components/ui/GrowthChart.jsx";
import Badge from "../components/ui/Badge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import { PageLoader } from "../components/ui/Spinner.jsx";
import {
  formatBdt,
  formatNumber,
  relativeTime,
  titleCase,
} from "../utils/format.js";

const ACTIVITY_ICONS = {
  create: "add_circle",
  update: "edit",
  status_change: "swap_horiz",
  delete: "delete",
  login: "login",
  logout: "logout",
};

function GrowthPanel({ title, metric }) {
  const [range, setRange] = useState("30d");
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchGrowth({ metric, range })
      .then((res) => {
        if (active) setSeries(res.series ?? []);
      })
      .catch(() => {
        if (active) setSeries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [metric, range]);

  return (
    <div className="admin-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        <div className="flex rounded-lg border border-surface-border p-0.5 text-xs font-semibold">
          {["30d", "12m"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 transition ${
                range === r
                  ? "bg-primary text-white"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {r === "30d" ? "30 days" : "12 months"}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex h-[280px] items-center justify-center text-ink-faint">
          Loading chart…
        </div>
      ) : (
        <GrowthChart data={series} type={range === "12m" ? "bar" : "area"} />
      )}
    </div>
  );
}

export default function OverviewPage() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchOverview(), fetchRecent()])
      .then(([ov, rc]) => {
        if (!active) return;
        setOverview(ov.overview);
        setRecent(rc);
      })
      .catch((err) => {
        if (active) toast.error(err.message ?? "Failed to load analytics.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  if (loading) return <PageLoader label="Loading analytics…" />;

  const cards = overview
    ? [
        { label: "Total Users", value: formatNumber(overview.totalUsers), icon: "group", tone: "primary" },
        { label: "Active Users", value: formatNumber(overview.activeUsers), icon: "how_to_reg", tone: "info" },
        { label: "Total Listings", value: formatNumber(overview.totalListings), icon: "inventory_2", tone: "primary" },
        { label: "Active Listings", value: formatNumber(overview.activeListings), icon: "sell", tone: "info" },
        { label: "Pending Listings", value: formatNumber(overview.pendingListings), icon: "pending", tone: "warning" },
        { label: "Completed Swaps", value: formatNumber(overview.completedSwaps), icon: "handshake", tone: "primary" },
        { label: "Pending Requests", value: formatNumber(overview.pendingSwapRequests), icon: "schedule", tone: "warning" },
        { label: "Swap Value", value: formatBdt(overview.totalSwapValue), icon: "payments", tone: "primary" },
        { label: "Categories", value: formatNumber(overview.totalCategories), icon: "category", tone: "ink" },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        subtitle="Key platform metrics at a glance"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GrowthPanel title="User Growth" metric="users" />
        <GrowthPanel title="Listing Growth" metric="listings" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Latest users */}
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
            <h3 className="font-display text-base font-bold text-ink">
              Latest Users
            </h3>
            <Link to="/users" className="text-sm font-semibold text-primary-600">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-surface-border">
            {(recent?.latestUsers ?? []).map((u) => (
              <li key={u.id}>
                <Link
                  to={`/users/${u.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted"
                >
                  <Avatar name={u.fullName} src={u.profileImageUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {u.fullName}
                    </p>
                    <p className="truncate text-xs text-ink-faint">{u.email}</p>
                  </div>
                  <Badge value={u.status} />
                </Link>
              </li>
            ))}
            {(recent?.latestUsers ?? []).length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-ink-faint">
                No users yet.
              </li>
            ) : null}
          </ul>
        </div>

        {/* Latest listings */}
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
            <h3 className="font-display text-base font-bold text-ink">
              Latest Listings
            </h3>
            <Link to="/listings" className="text-sm font-semibold text-primary-600">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-surface-border">
            {(recent?.latestListings ?? []).map((l) => (
              <li key={l.id}>
                <Link
                  to={`/listings/${l.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {l.title}
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {l.categoryName || titleCase(l.listingType)}
                    </p>
                  </div>
                  <Badge value={l.status} />
                </Link>
              </li>
            ))}
            {(recent?.latestListings ?? []).length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-ink-faint">
                No listings yet.
              </li>
            ) : null}
          </ul>
        </div>

        {/* Recent activity */}
        <div className="admin-card overflow-hidden">
          <div className="border-b border-surface-border px-5 py-4">
            <h3 className="font-display text-base font-bold text-ink">
              Recent Activity
            </h3>
          </div>
          <ul className="divide-y divide-surface-border">
            {(recent?.recentActivities ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-soft">
                  <MaterialIcon
                    name={ACTIVITY_ICONS[a.action] ?? "bolt"}
                    className="text-[18px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{titleCase(a.action)}</span>{" "}
                    <span className="text-ink-soft">
                      on {titleCase(a.entityType)}
                    </span>
                  </p>
                  <p className="text-xs text-ink-faint">
                    {a.metadata?.actorEmail ? `${a.metadata.actorEmail} · ` : ""}
                    {relativeTime(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
            {(recent?.recentActivities ?? []).length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-ink-faint">
                No recent activity.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
