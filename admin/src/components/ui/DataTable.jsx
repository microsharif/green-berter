import MaterialIcon from "./MaterialIcon.jsx";
import Spinner from "./Spinner.jsx";

/**
 * Generic table renderer.
 *
 * columns: [{ key, header, render?(row), sortable?, className?, align? }]
 * sort: { sortBy, sortDir } current state (optional)
 * onSort(key): toggles sorting for a column (optional)
 * onRowClick(row): optional row handler
 */
export default function DataTable({
  columns,
  rows,
  loading,
  emptyLabel = "No records found.",
  sort,
  onSort,
  onRowClick,
  rowKey = (row) => row.id,
}) {
  return (
    <div className="overflow-x-auto thin-scroll">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-muted/60">
            {columns.map((col) => {
              const isSorted = sort?.sortBy === col.key;
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft ${
                    col.align === "right" ? "text-right" : ""
                  } ${col.sortable && onSort ? "cursor-pointer select-none" : ""}`}
                  onClick={
                    col.sortable && onSort ? () => onSort(col.key) : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && onSort ? (
                      <MaterialIcon
                        name={
                          isSorted
                            ? sort.sortDir === "asc"
                              ? "arrow_upward"
                              : "arrow_downward"
                            : "unfold_more"
                        }
                        className={`text-[16px] ${isSorted ? "text-primary" : "text-ink-faint"}`}
                      />
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <Spinner className="text-primary" />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-ink-faint"
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-b border-surface-border last:border-0 transition hover:bg-surface-muted/60 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 align-middle text-ink ${
                      col.align === "right" ? "text-right" : ""
                    } ${col.className ?? ""}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
