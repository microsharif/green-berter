import { useCallback, useId, useMemo, useRef, useState } from "react";
import FloatingDropdownList from "./FloatingDropdownList.jsx";
import MaterialIcon from "./MaterialIcon.jsx";
import { filterOptionsByQuery } from "./filterOptionsByQuery.js";
import { useDismissOnOutsidePointer } from "./useDismissOnOutsidePointer.js";

/**
 * Searchable dropdown for a single level of options (e.g. category cascade).
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {Array<{ id: string, name: string }>} props.options
 * @param {{ id: string, name: string } | null} props.selected
 * @param {(value: { id: string, name: string } | null) => void} props.onSelect
 * @param {boolean} [props.loading]
 * @param {boolean} [props.error]
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {string} [props.clearLabel]
 */
export default function SearchableOptionCombobox({
  label,
  options,
  selected,
  onSelect,
  loading = false,
  error = false,
  disabled = false,
  placeholder,
  clearLabel = "Select…",
}) {
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const searchPlaceholder =
    placeholder ?? `Search ${label.toLowerCase()}…`;

  const matches = useMemo(
    () => filterOptionsByQuery(options, query, { showAllWhenEmpty: true }),
    [options, query]
  );

  const showDropdown =
    open && !disabled && !loading && !error && options.length > 0;

  const inputDisplayValue =
    editing || !selected ? query : selected.name;

  const dismiss = useCallback(() => {
    setOpen(false);
    setEditing(false);
    setQuery("");
  }, []);

  useDismissOnOutsidePointer(showDropdown, rootRef, listboxId, dismiss);

  function handleFocus() {
    if (disabled || loading || error) return;
    setOpen(true);
    setEditing(true);
    setQuery("");
  }

  function pick(option) {
    onSelect(option);
    setQuery("");
    setEditing(false);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleClear(e) {
    e.preventDefault();
    e.stopPropagation();
    pick(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 min-h-[1.25rem]">
        <label
          htmlFor={inputId}
          className="block text-sm font-bold font-headline text-on-surface"
        >
          {label}
        </label>
        {loading ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0"
            aria-live="polite"
            aria-busy="true"
          >
            <MaterialIcon
              name="progress_activity"
              className="text-lg animate-spin text-primary"
              aria-hidden
            />
            <span className="tabular-nums">Loading…</span>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div
          className="w-full h-[3.25rem] rounded-lg bg-surface-container-low ring-1 ring-inset ring-outline-variant/20 animate-pulse"
          aria-hidden
        />
      ) : (
        <div ref={rootRef} className="relative z-0">
          <div
            className={`flex items-center gap-2 rounded-lg border bg-surface-container-low transition-colors ${
              open
                ? "border-primary/50 ring-2 ring-primary/15"
                : "border-outline-variant/60"
            } ${disabled || error ? "opacity-60 pointer-events-none" : ""}`}
          >
            <MaterialIcon
              name="search"
              className="ml-3 text-on-surface-variant text-sm shrink-0"
              aria-hidden
            />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls={listboxId}
              aria-autocomplete="list"
              disabled={disabled || error || options.length === 0}
              placeholder={
                error
                  ? "Failed to load"
                  : options.length === 0
                    ? "No options"
                    : searchPlaceholder
              }
              value={inputDisplayValue}
              onChange={(e) => {
                setQuery(e.target.value);
                setEditing(true);
                setOpen(true);
              }}
              onFocus={handleFocus}
              className="flex-1 min-w-0 bg-transparent border-none py-3.5 pr-2 text-sm text-on-surface focus:outline-none placeholder:text-outline"
            />
            {selected && !editing ? (
              <button
                type="button"
                onClick={handleClear}
                className="mr-2 p-1 rounded-full text-on-surface-variant hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                aria-label={`Clear ${label}`}
              >
                <MaterialIcon name="close" className="text-lg" />
              </button>
            ) : null}
          </div>

          <FloatingDropdownList
            anchorRef={rootRef}
            open={showDropdown}
            listboxId={listboxId}
          >
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!selected}
                onClick={() => pick(null)}
                className="w-full text-left px-3 py-2.5 text-sm text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors"
              >
                {clearLabel}
              </button>
            </li>

            {query.trim() && matches.length === 0 ? (
              <li className="px-3 py-3 text-sm text-on-surface-variant">
                No matches for &ldquo;{query.trim()}&rdquo;
              </li>
            ) : null}

            {matches.map((option) => {
              const isSelected = selected?.id === option.id;
              return (
                <li key={option.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(option)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors truncate ${
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-primary/5 text-on-surface"
                    }`}
                  >
                    {option.name}
                  </button>
                </li>
              );
            })}
          </FloatingDropdownList>
        </div>
      )}

      {!loading && error ? (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <MaterialIcon name="error" className="text-sm" aria-hidden />
          Could not load options. Check your connection and reload the page.
        </p>
      ) : null}
    </div>
  );
}
