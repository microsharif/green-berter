import { useEffect, useState } from "react";
import { fetchCategoryChildren } from "../../api/categories.js";
import { isCategoryLeaf } from "../../constants/categoryLevels.js";

function CategoryLevel({
  listingType,
  parentId,
  value,
  onChange,
  label,
  levelIndex,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
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

  const selectId = `edit-category-${listingType}-${levelIndex}`;

  return (
    <div className="space-y-2">
      <label htmlFor={selectId} className="block text-sm font-bold text-green-900">
        {label}
      </label>
      {loading ? (
        <div className="w-full h-12 rounded-xl bg-[#fcf9f8] border border-zinc-200/80 animate-pulse" />
      ) : (
        <select
          id={selectId}
          className={`w-full px-4 py-3 rounded-xl bg-[#fcf9f8] border border-zinc-200/80 focus:ring-2 focus:ring-primary/40 text-on-surface ${
            errored ? "ring-2 ring-red-400/50" : ""
          }`}
          value={value ?? ""}
          disabled={errored || options.length === 0}
          onChange={(e) => {
            const idVal = e.target.value || null;
            const picked = options.find((o) => o.id === idVal) ?? null;
            onChange(picked);
          }}
        >
          <option value="">
            {errored ? "Failed to load" : "Select…"}
          </option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * Cascading category picker for the edit-listing modal (local state).
 */
export default function EditListingCategoryFields({
  listingType,
  categoryPath,
  onSelectAtDepth,
}) {
  const lastPicked = categoryPath[categoryPath.length - 1];
  const reachedLeaf = isCategoryLeaf(lastPicked);
  const slotsToShow = reachedLeaf
    ? categoryPath.length
    : categoryPath.length + 1;
  const labels = ["Category", "Subcategory", "Item"];

  return (
    <div className="space-y-3">
      {Array.from({ length: slotsToShow }).map((_, depth) => {
        const parentId =
          depth === 0 ? null : categoryPath[depth - 1]?.id ?? null;
        const picked = categoryPath[depth] ?? null;
        return (
          <CategoryLevel
            key={`${listingType}:${depth}:${parentId ?? "root"}`}
            listingType={listingType}
            parentId={parentId}
            levelIndex={depth}
            value={picked?.id ?? ""}
            label={labels[depth] ?? `Level ${depth + 1}`}
            onChange={(selection) => onSelectAtDepth(depth, selection)}
          />
        );
      })}
    </div>
  );
}
