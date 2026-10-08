import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchListings } from "../api/listings.js";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/layout/PageHeader.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import Badge from "../components/ui/Badge.jsx";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import { formatDate, resolveMediaUrl, titleCase } from "../utils/format.js";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  "",
  "available",
  "pending",
  "accepted",
  "completed",
  "rejected",
  "cancelled",
];
const TYPE_OPTIONS = ["", "give", "exchange"];

function Thumb({ src, title }) {
  const url = resolveMediaUrl(src);
  if (!url) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-faint">
        <MaterialIcon name="image" className="text-[20px]" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={title}
      className="h-10 w-10 rounded-lg object-cover ring-1 ring-surface-border"
    />
  );
}

export default function ListingsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [listingType, setListingType] = useState("");
  const [sort, setSort] = useState({ sortBy: "createdAt", sortDir: "desc" });

  const load = useCallback(() => {
    setLoading(true);
    fetchListings({
      limit: PAGE_SIZE,
      offset,
      search,
      status,
      listingType,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
    })
      .then((res) => {
        setRows(res.listings ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => toast.error(err.message ?? "Failed to load listings."))
      .finally(() => setLoading(false));
  }, [offset, search, status, listingType, sort, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const onSort = (key) => {
    setOffset(0);
    setSort((prev) =>
      prev.sortBy === key
        ? { sortBy: key, sortDir: prev.sortDir === "asc" ? "desc" : "asc" }
        : { sortBy: key, sortDir: "asc" }
    );
  };

  const columns = [
    {
      key: "title",
      header: "Listing",
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-3">
          <Thumb src={l.imageUrl} title={l.title} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{l.title}</p>
            <p className="truncate text-xs text-ink-faint">{l.categoryName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (l) => (
        <span className="text-sm text-ink-soft">
          {l.owner?.fullName ?? "—"}
        </span>
      ),
    },
    {
      key: "listingType",
      header: "Type",
      render: (l) => <Badge value={l.listingType} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (l) => <Badge value={l.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (l) => (
        <span className="text-sm text-ink-soft">{formatDate(l.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <MaterialIcon name="chevron_right" className="text-ink-faint" />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Listings" subtitle="Moderate and manage all listings" />

      <div className="admin-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-faint"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title…"
              className="admin-input pl-10"
            />
          </div>
          <select
            value={listingType}
            onChange={(e) => {
              setOffset(0);
              setListingType(e.target.value);
            }}
            className="admin-input w-auto"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t || "all"} value={t}>
                {t ? titleCase(t) : "All types"}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setOffset(0);
              setStatus(e.target.value);
            }}
            className="admin-input w-auto"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? titleCase(s) : "All statuses"}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyLabel="No listings match your filters."
          sort={sort}
          onSort={onSort}
          onRowClick={(l) => navigate(`/listings/${l.id}`)}
        />

        <Pagination
          total={total}
          limit={PAGE_SIZE}
          offset={offset}
          onChange={setOffset}
        />
      </div>
    </div>
  );
}
