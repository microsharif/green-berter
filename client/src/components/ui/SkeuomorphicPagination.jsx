import { useMemo } from "react";
import MaterialIcon from "./MaterialIcon.jsx";

/** @returns {(number | "ellipsis")[]} */
function buildPaginationRange(page, totalPages) {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [0];

  const last = totalPages - 1;
  const items = [];

  if (totalPages <= 11) {
    for (let i = 0; i < totalPages; i += 1) items.push(i);
    return items;
  }

  items.push(0);

  let start;
  let end;

  if (page < 7) {
    start = 1;
    end = Math.min(8, last - 1);
  } else if (page > last - 7) {
    start = Math.max(1, last - 8);
    end = last - 1;
  } else {
    start = page - 2;
    end = page + 2;
  }

  if (start > 1) items.push("ellipsis");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < last - 1) items.push("ellipsis");
  if (last > 0) items.push(last);

  return items;
}

const trackClass =
  "inline-flex items-center gap-1 px-2 py-1.5 rounded-full bg-surface-container-low dark:bg-zinc-800/90 border border-outline-variant/25 dark:border-zinc-700 shadow-[inset_0_2px_6px_rgba(13,99,27,0.08),inset_0_-1px_2px_rgba(255,255,255,0.85)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.35),inset_0_-1px_1px_rgba(255,255,255,0.06)]";

const raisedBtnClass =
  "inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-lg text-sm font-bold tabular-nums text-on-surface-variant dark:text-zinc-300 bg-gradient-to-b from-surface-bright to-surface-container dark:from-zinc-700 dark:to-zinc-800 shadow-[0_2px_4px_rgba(13,99,27,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] dark:shadow-[0_2px_4px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.08)_inset] hover:from-white hover:to-surface-container-low dark:hover:from-zinc-600 dark:hover:to-zinc-700 transition-[background,box-shadow,transform] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

const activeBtnClass =
  "inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-lg text-sm font-bold tabular-nums text-primary dark:text-primary-fixed bg-gradient-to-b from-primary/15 to-primary/30 dark:from-primary/25 dark:to-primary/40 shadow-[inset_0_2px_5px_rgba(13,99,27,0.22),inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(136,217,130,0.15)] cursor-default";

const navBtnClass = `${raisedBtnClass} min-w-[2rem]`;

/**
 * Inset-track pagination with raised page chips (0-based page index).
 */
export default function SkeuomorphicPagination({
  page = 0,
  totalPages = 1,
  total = 0,
  loading = false,
  onPageChange,
}) {
  const items = useMemo(
    () => buildPaginationRange(page, totalPages),
    [page, totalPages]
  );

  const disabled = loading || total === 0;
  const atStart = page === 0 || disabled;
  const atEnd = page >= totalPages - 1 || disabled;

  return (
    <nav aria-label="Pagination" className={trackClass}>
      <button
        type="button"
        aria-label="Previous page"
        disabled={atStart}
        onClick={() => onPageChange?.(page - 1)}
        className={navBtnClass}
      >
        <MaterialIcon name="chevron_left" className="text-lg leading-none" />
      </button>

      {items.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex items-center justify-center min-w-[1.75rem] h-8 px-0.5 text-sm font-bold text-outline dark:text-zinc-500 select-none"
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        const isActive = item === page;

        return (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item + 1}`}
            aria-current={isActive ? "page" : undefined}
            disabled={disabled || isActive}
            onClick={() => onPageChange?.(item)}
            className={isActive ? activeBtnClass : raisedBtnClass}
          >
            {item + 1}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Next page"
        disabled={atEnd}
        onClick={() => onPageChange?.(page + 1)}
        className={navBtnClass}
      >
        <MaterialIcon name="chevron_right" className="text-lg leading-none" />
      </button>
    </nav>
  );
}
