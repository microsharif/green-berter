import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCategoryChildren } from "../../api/categories.js";
import { isCategoryLeaf } from "../../constants/categoryLevels.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function rowClass(selected) {
  const base =
    "flex-1 min-w-0 text-left flex items-center gap-2 text-sm rounded-lg py-2 pr-2 transition-colors";
  if (selected) {
    return `${base} text-primary font-semibold bg-primary/5`;
  }
  return `${base} text-on-surface-variant hover:text-primary hover:bg-zinc-50/80`;
}

/**
 * Lazy expandable category tree for browse filters.
 * Any level (L1, L2, leaf) can be selected to filter the product grid.
 */
export default function CategoryFilterTree({
  listingType,
  selectedCategory,
  onSelectCategory,
}) {
  const selectedCategoryId = selectedCategory?.id ?? null;

  const [l1Categories, setL1Categories] = useState([]);
  const [childrenByParentId, setChildrenByParentId] = useState({});
  const [expandedIds, setExpandedIds] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState([]);
  const [errorKeys, setErrorKeys] = useState([]);
  const [rootLoading, setRootLoading] = useState(true);
  const [rootError, setRootError] = useState(false);
  const loadedParentsRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setRootLoading(true);
    setRootError(false);
    setL1Categories([]);
    setChildrenByParentId({});
    setExpandedIds([]);
    setLoadingKeys([]);
    setErrorKeys([]);
    loadedParentsRef.current = new Set();

    fetchCategoryChildren({ listingType })
      .then((rows) => {
        if (!cancelled) setL1Categories(rows);
      })
      .catch(() => {
        if (!cancelled) setRootError(true);
      })
      .finally(() => {
        if (!cancelled) setRootLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingType]);

  const loadChildren = useCallback(
    async (parentId) => {
      if (loadedParentsRef.current.has(parentId)) return;
      loadedParentsRef.current.add(parentId);

      setLoadingKeys((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
      setErrorKeys((prev) => prev.filter((k) => k !== parentId));

      try {
        const rows = await fetchCategoryChildren({
          listingType,
          parentId,
        });
        setChildrenByParentId((prev) => ({ ...prev, [parentId]: rows }));
      } catch {
        loadedParentsRef.current.delete(parentId);
        setErrorKeys((prev) =>
          prev.includes(parentId) ? prev : [...prev, parentId]
        );
      } finally {
        setLoadingKeys((prev) => prev.filter((k) => k !== parentId));
      }
    },
    [listingType]
  );

  const toggleExpand = useCallback(
    async (cat, e) => {
      e?.stopPropagation?.();
      if (cat.isLeaf ?? isCategoryLeaf(cat)) return;
      const id = cat.id;
      const isExpanded = expandedIds.includes(id);

      if (isExpanded) {
        setExpandedIds((prev) => prev.filter((x) => x !== id));
        return;
      }

      setExpandedIds((prev) => [...prev, id]);
      if (!childrenByParentId[id]) {
        await loadChildren(id);
      }
    },
    [expandedIds, childrenByParentId, loadChildren]
  );

  const expandAncestors = useCallback(
    async (cat) => {
      const toExpand = new Set();
      if (Array.isArray(cat.ancestors)) {
        for (const aid of cat.ancestors) toExpand.add(String(aid));
      }
      if (cat.parentId) toExpand.add(String(cat.parentId));
      if (!(cat.isLeaf ?? isCategoryLeaf(cat))) toExpand.add(String(cat.id));

      if (toExpand.size === 0) return;

      setExpandedIds((prev) => [...new Set([...prev, ...toExpand])]);
      await Promise.all([...toExpand].map((parentId) => loadChildren(parentId)));
    },
    [loadChildren]
  );

  const handleCategorySelect = useCallback(
    async (cat) => {
      if (selectedCategoryId === cat.id) {
        onSelectCategory(null);
        return;
      }

      onSelectCategory({
        id: cat.id,
        name: cat.name,
        level: cat.level,
        isLeaf: cat.isLeaf ?? isCategoryLeaf(cat),
        hasChildren: cat.hasChildren ?? !isCategoryLeaf(cat),
      });

      await expandAncestors(cat);
    },
    [selectedCategoryId, onSelectCategory, expandAncestors]
  );

  function renderNodes(categories, depth) {
    return categories.map((cat) => {
      const isLeaf = cat.isLeaf ?? isCategoryLeaf(cat);
      const isExpanded = expandedIds.includes(cat.id);
      const children = childrenByParentId[cat.id] ?? [];
      const isLoading = loadingKeys.includes(cat.id);
      const hasError = errorKeys.includes(cat.id);
      const isSelected = selectedCategoryId === cat.id;
      const paddingLeft = 8 + depth * 12;

      return (
        <li key={cat.id}>
          <div
            className="flex items-center gap-0.5"
            style={{ paddingLeft }}
          >
            {!isLeaf ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(cat, e)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-primary hover:bg-zinc-100 shrink-0"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${cat.name}`}
              >
                <MaterialIcon
                  name={isExpanded ? "expand_more" : "chevron_right"}
                  className="text-lg"
                  aria-hidden
                />
              </button>
            ) : (
              <span className="w-8 shrink-0" aria-hidden />
            )}

            <button
              type="button"
              onClick={() => handleCategorySelect(cat)}
              className={rowClass(isSelected)}
              aria-current={isSelected ? "true" : undefined}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isSelected ? "bg-primary" : "bg-outline-variant"
                }`}
                aria-hidden
              />
              <span className="flex-1 truncate">{cat.name}</span>
              {isLoading ? (
                <MaterialIcon
                  name="progress_activity"
                  className="text-base animate-spin text-primary shrink-0"
                  aria-label="Loading subcategories"
                />
              ) : null}
            </button>
          </div>
          {hasError ? (
            <p
              className="text-xs text-red-600 py-1"
              style={{ paddingLeft: paddingLeft + 36 }}
            >
              Could not load subcategories
            </p>
          ) : null}
          {isExpanded && children.length > 0 ? (
            <ul className="space-y-0.5 mt-0.5">
              {renderNodes(children, depth + 1)}
            </ul>
          ) : null}
        </li>
      );
    });
  }

  if (rootLoading) {
    return (
      <p className="px-2 text-sm text-on-surface-variant flex items-center gap-2">
        <MaterialIcon
          name="progress_activity"
          className="text-base animate-spin text-primary"
        />
        Loading categories…
      </p>
    );
  }

  if (rootError) {
    return (
      <p className="px-2 text-sm text-red-600">Could not load categories.</p>
    );
  }

  if (l1Categories.length === 0) {
    return (
      <p className="px-2 text-sm text-on-surface-variant">No categories found.</p>
    );
  }

  return (
    <div className="space-y-2">
      {selectedCategory?.name ? (
        <p className="px-2 text-xs text-primary font-medium">
          Filtering: {selectedCategory.name}
        </p>
      ) : null}
      <ul className="space-y-0.5 px-1">
        <li>
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={rowClass(!selectedCategoryId)}
            style={{ paddingLeft: 8 }}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                !selectedCategoryId ? "bg-primary" : "bg-outline-variant"
              }`}
              aria-hidden
            />
            <span>All categories</span>
          </button>
        </li>
        {renderNodes(l1Categories, 0)}
      </ul>
    </div>
  );
}
