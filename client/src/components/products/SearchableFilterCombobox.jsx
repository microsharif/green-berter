import { useCallback, useId, useMemo, useRef, useState } from "react";
import FloatingDropdownList from "../ui/FloatingDropdownList.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { useDismissOnOutsidePointer } from "../ui/useDismissOnOutsidePointer.js";
import { filterFlatBrowseOptions } from "./flattenBrowseTrees.js";

/**
 * Searchable dropdown for flattened location/category options (mobile).
 *
 * @param {Object} props
 * @param {import("./flattenBrowseTrees.js").FlatBrowseOption[]} props.items
 * @param {{ id: string, name: string, level: number } | null} props.selected
 * @param {(value: { id: string, name: string, level: number } | null) => void} props.onSelect
 * @param {boolean} props.loading
 * @param {boolean} props.error
 * @param {string} [props.placeholder]
 * @param {string} [props.allLabel]
 * @param {boolean} [props.disabled]
 */
export default function SearchableFilterCombobox({
  items,
  selected,
  onSelect,
  loading,
  error,
  placeholder = "Search…",
  allLabel = "All",
  disabled = false,
}) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const selectedOption = useMemo(
    () => (selected ? items.find((i) => i.id === selected.id) : null),
    [items, selected]
  );

  const matches = useMemo(
    () => filterFlatBrowseOptions(items, query),
    [items, query]
  );

  const showDropdown =
    open && !disabled && !loading && !error && (query.trim() || editing);

  const inputDisplayValue =
    editing || !selectedOption
      ? query
      : selectedOption.breadcrumb || selectedOption.name;

  const dismiss = useCallback(() => {
    setOpen(false);
    setEditing(false);
    setQuery("");
  }, []);

  useDismissOnOutsidePointer(showDropdown, rootRef, listboxId, dismiss);

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    setEditing(true);
    setQuery("");
  }

  function pick(option) {
    if (!option) {
      onSelect(null);
    } else {
      onSelect({
        id: option.id,
        name: option.name,
        level: option.level,
      });
    }
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
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-lg border bg-surface-container-lowest transition-colors ${
          open
            ? "border-primary/50 ring-2 ring-primary/15"
            : "border-outline-variant"
        } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      >
        <MaterialIcon
          name="search"
          className="ml-3 text-on-surface-variant text-sm shrink-0"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          disabled={disabled || loading}
          placeholder={loading ? "Loading…" : placeholder}
          value={inputDisplayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setEditing(true);
            setOpen(true);
          }}
          onFocus={handleFocus}
          className="flex-1 min-w-0 bg-transparent border-none py-3 pr-2 text-sm focus:outline-none placeholder:text-outline"
        />
        {selected && !editing ? (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 p-1 rounded-full text-on-surface-variant hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
            aria-label={`Clear ${allLabel.toLowerCase()} selection`}
          >
            <MaterialIcon name="close" className="text-lg" />
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-2 px-1 text-xs text-on-surface-variant flex items-center gap-1.5">
          <MaterialIcon
            name="progress_activity"
            className="text-sm animate-spin text-primary"
          />
          Loading options…
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 px-1 text-xs text-red-600">Could not load options.</p>
      ) : null}

      <FloatingDropdownList
        anchorRef={rootRef}
        open={showDropdown}
        listboxId={listboxId}
        className="max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-outline-variant bg-surface-container-lowest shadow-xl py-1"
      >
          {!query.trim() ? (
            <li className="px-3 py-3 text-sm text-on-surface-variant">
              Start typing to search {allLabel.toLowerCase()}
            </li>
          ) : null}

          {query.trim() ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!selected}
                onClick={() => pick(null)}
                className="w-full text-left px-3 py-2.5 text-sm text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors"
              >
                {allLabel}
              </button>
            </li>
          ) : null}

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
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-primary/5 text-on-surface"
                  }`}
                >
                  <span className="block text-sm font-medium truncate">
                    {option.name}
                  </span>
                  <span className="block text-xs text-on-surface-variant mt-0.5 truncate">
                    <span className="font-semibold text-primary/80">
                      {option.levelLabel}
                    </span>
                    {" · "}
                    {option.breadcrumb}
                  </span>
                </button>
              </li>
            );
          })}
      </FloatingDropdownList>

      {!editing && selectedOption ? (
        <p className="mt-1.5 px-1 text-xs text-primary font-medium truncate">
          Filtering: {selectedOption.breadcrumb}
        </p>
      ) : null}
    </div>
  );
}
