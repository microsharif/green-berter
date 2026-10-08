import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../api/users.js";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/layout/PageHeader.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import Badge from "../components/ui/Badge.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import { formatDate, titleCase } from "../utils/format.js";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["", "active", "disabled", "suspended", "banned"];

export default function UsersPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState({ sortBy: "createdAt", sortDir: "desc" });

  const load = useCallback(() => {
    setLoading(true);
    fetchUsers({
      limit: PAGE_SIZE,
      offset,
      search,
      status,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
    })
      .then((res) => {
        setRows(res.users ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => toast.error(err.message ?? "Failed to load users."))
      .finally(() => setLoading(false));
  }, [offset, search, status, sort, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce the search input into the actual query.
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
      key: "fullName",
      header: "User",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} src={u.profileImageUrl} size={38} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{u.fullName}</p>
            <p className="truncate text-xs text-ink-faint">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (u) => u.phone || <span className="text-ink-faint">—</span>,
    },
    {
      key: "membership",
      header: "Plan",
      render: (u) => (
        <span className="text-sm capitalize text-ink-soft">
          {u.membership?.plan ?? "free"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge value={u.status} />,
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (u) => (
        <span className="text-sm text-ink-soft">{formatDate(u.createdAt)}</span>
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
      <PageHeader title="Users" subtitle="Manage registered platform users" />

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
              placeholder="Search by name, email, or phone…"
              className="admin-input pl-10"
            />
          </div>
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
          emptyLabel="No users match your filters."
          sort={sort}
          onSort={onSort}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
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
