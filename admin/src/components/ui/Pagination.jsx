import MaterialIcon from "./MaterialIcon.jsx";

/**
 * Offset-based pagination control. `total` is the full row count; `limit` and
 * `offset` define the current window.
 */
export default function Pagination({ total, limit, offset, onChange }) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  const go = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), pages);
    onChange((clamped - 1) * limit);
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t border-surface-border px-4 py-3 text-sm text-ink-soft">
      <span>
        Showing <strong className="text-ink">{from}</strong>–
        <strong className="text-ink">{to}</strong> of{" "}
        <strong className="text-ink">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="admin-btn-ghost px-2 py-1.5"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
        </button>
        <span className="px-2 text-xs font-semibold text-ink">
          Page {page} / {pages}
        </span>
        <button
          type="button"
          className="admin-btn-ghost px-2 py-1.5"
          disabled={page >= pages}
          onClick={() => go(page + 1)}
        >
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
