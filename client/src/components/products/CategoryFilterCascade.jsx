import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCategoryById } from "../../api/categories.js";
import { CategoryCascade } from "../upload/CategoryFields.jsx";

/**
 * Browse category filter — searchable L1 → L2 cascade (L3 for Give → Zakat).
 * Most trees are 2 levels; Give → Zakat alone adds a third picker level.
 */
export default function CategoryFilterCascade({
  listingType,
  selectedCategory,
  onSelectCategory,
}) {
  const [categoryPath, setCategoryPath] = useState([]);
  const [rehydrating, setRehydrating] = useState(false);
  const rehydratedForRef = useRef(null);

  useEffect(() => {
    rehydratedForRef.current = null;
    setCategoryPath([]);
  }, [listingType]);

  useEffect(() => {
    if (!selectedCategory?.id) {
      rehydratedForRef.current = null;
      setCategoryPath([]);
      return undefined;
    }

    if (rehydratedForRef.current === selectedCategory.id) {
      return undefined;
    }

    let cancelled = false;
    setRehydrating(true);

    fetchCategoryById(selectedCategory.id)
      .then(({ breadcrumb }) => {
        if (cancelled) return;
        rehydratedForRef.current = selectedCategory.id;
        if (breadcrumb?.length) {
          setCategoryPath(breadcrumb);
        } else {
          setCategoryPath([
            {
              id: selectedCategory.id,
              name: selectedCategory.name,
              level: selectedCategory.level,
            },
          ]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        rehydratedForRef.current = selectedCategory.id;
        setCategoryPath([
          {
            id: selectedCategory.id,
            name: selectedCategory.name,
            level: selectedCategory.level,
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setRehydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, listingType]);

  const handleSelectAtDepth = useCallback(
    (depth, selection) => {
      setCategoryPath((prev) => {
        const next = prev.slice(0, depth);
        if (selection) next.push(selection);

        const active = next[next.length - 1] ?? null;
        rehydratedForRef.current = active?.id ?? null;

        onSelectCategory(
          active
            ? {
                id: String(active.id),
                name: String(active.name),
                level: Number(active.level),
              }
            : null
        );

        return next;
      });
    },
    [onSelectCategory]
  );

  const filterLabel = categoryPath.map((n) => n.name).join(" › ");

  return (
    <div className="space-y-3">
      {selectedCategory?.name && filterLabel ? (
        <p className="text-xs text-primary font-medium px-1">
          Filtering: {filterLabel}
        </p>
      ) : null}

      <CategoryCascade
        key={listingType}
        listingType={listingType}
        categoryPath={categoryPath}
        onSelectAtDepth={handleSelectAtDepth}
        idPrefix="browse-filter-category"
        labels={["Category", "Subcategory", "Item"]}
        disabled={rehydrating}
        searchable
      />

      {selectedCategory ? (
        <button
          type="button"
          onClick={() => {
            rehydratedForRef.current = null;
            setCategoryPath([]);
            onSelectCategory(null);
          }}
          className="text-xs font-semibold text-on-surface-variant hover:text-primary px-1"
        >
          Clear category filter
        </button>
      ) : null}
    </div>
  );
}
