import { useEffect, useState } from "react";
import { fetchCategoryChildren } from "../../api/categories.js";
import { isCategoryLeaf } from "../../constants/categoryLevels.js";
import { isOthersParentCategory } from "../../utils/categoryOthers.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import SearchableOptionCombobox from "../ui/SearchableOptionCombobox.jsx";

export function CategoryLevel({
  listingType,
  parentId,
  value,
  onChange,
  label,
  levelIndex,
  idPrefix = "category",
  disabled = false,
  searchable = false,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOptions([]);
    setLoading(true);
    setErrored(false);
    fetchCategoryChildren({ listingType, parentId })
      .then((cats) => {
        if (!cancelled) setOptions(cats);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingType, parentId]);

  const selectId = `${idPrefix}-select-${listingType}-${levelIndex}`;
  const picked = options.find((o) => o.id === value) ?? null;

  if (searchable) {
    return (
      <SearchableOptionCombobox
        label={label}
        options={options}
        selected={picked}
        onSelect={onChange}
        loading={loading}
        error={errored}
        disabled={disabled}
        placeholder={`Search ${label.toLowerCase()}…`}
        clearLabel="Select…"
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 min-h-[1.25rem]">
        <label
          htmlFor={loading ? undefined : selectId}
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
        <select
          id={selectId}
          className={`w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-60 ${
            errored ? "ring-2 ring-inset ring-red-400/50" : ""
          }`}
          value={value ?? ""}
          disabled={disabled || errored || options.length === 0}
          onChange={(e) => {
            const idVal = e.target.value || null;
            const next = options.find((o) => o.id === idVal) ?? null;
            onChange(next);
          }}
        >
          <option value="">
            {errored
              ? "Failed to load — try again or refresh"
              : options.length === 0
                ? "No categories"
                : "Select…"}
          </option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      )}

      {!loading && errored ? (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <MaterialIcon name="error" className="text-sm" aria-hidden />
          Could not load categories. Check your connection and reload the page.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Cascading category picker (level 0 root hidden).
 * Most branches leaf at level 2; Zakat alone continues to level 3.
 */
export function CategoryCascade({
  listingType,
  categoryPath,
  onSelectAtDepth,
  idPrefix = "category",
  labels = ["Category", "Subcategory", "Item"],
  disabled = false,
  searchable = false,
  othersNote = "",
  onOthersNoteChange,
}) {
  const othersParent = categoryPath[0];
  const isOthersMode =
    typeof onOthersNoteChange === "function" &&
    isOthersParentCategory(othersParent);
  const lastPicked = categoryPath[categoryPath.length - 1];
  const reachedLeaf = isCategoryLeaf(lastPicked);
  const slotsToShow = isOthersMode
    ? 1
    : reachedLeaf
      ? categoryPath.length
      : categoryPath.length + 1;

  useEffect(() => {
    if (!isOthersMode || !othersParent?.id) return undefined;

    const currentLeaf = categoryPath[categoryPath.length - 1];
    if (currentLeaf && isCategoryLeaf(currentLeaf)) return undefined;

    let cancelled = false;
    fetchCategoryChildren({ listingType, parentId: othersParent.id })
      .then((children) => {
        if (cancelled || !children.length) return;
        const child = children.find((c) => c.name === "Others") ?? children[0];
        if (child && categoryPath[1]?.id !== child.id) {
          onSelectAtDepth(1, child);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    isOthersMode,
    othersParent?.id,
    listingType,
    categoryPath,
    onSelectAtDepth,
  ]);

  return (
    <div key={listingType} className="space-y-4">
      {Array.from({ length: slotsToShow }).map((_, depth) => {
        const parentId =
          depth === 0 ? null : categoryPath[depth - 1]?.id ?? null;
        const picked = categoryPath[depth] ?? null;
        return (
          <CategoryLevel
            key={`${idPrefix}:${listingType}:${depth}:${parentId ?? "root"}`}
            listingType={listingType}
            parentId={parentId}
            levelIndex={depth}
            value={picked?.id ?? ""}
            label={labels[depth] ?? `Level ${depth + 1}`}
            onChange={(selection) => onSelectAtDepth(depth, selection)}
            idPrefix={idPrefix}
            disabled={disabled}
            searchable={searchable}
          />
        );
      })}

      {isOthersMode ? (
        <div>
          <label
            htmlFor={`${idPrefix}-others-note`}
            className="block text-sm font-bold font-headline mb-2 text-on-surface"
          >
            Note
          </label>
          <textarea
            id={`${idPrefix}-others-note`}
            className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 resize-y min-h-[5rem]"
            placeholder="Describe what kind of item this is…"
            rows={3}
            value={othersNote}
            disabled={disabled}
            onChange={(e) => onOthersNoteChange(e.target.value)}
          />
          <p className="text-[10px] text-zinc-400 mt-2">
            Helps others understand your item when it does not fit a standard
            category.
          </p>
        </div>
      ) : null}
    </div>
  );
}
