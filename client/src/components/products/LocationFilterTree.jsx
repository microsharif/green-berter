import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLocationChildren } from "../../api/locations.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

/** Matches server `MAX_LOCATION_LEVEL` — listings attach to level 2 (area). */
const LEAF_LEVEL = 2;

function rowClass(selected) {
  const base =
    "flex-1 min-w-0 text-left flex items-center gap-2 text-sm rounded-lg py-2 pr-2 transition-colors";
  if (selected) {
    return `${base} text-primary font-semibold bg-primary/5`;
  }
  return `${base} text-on-surface-variant hover:text-primary hover:bg-zinc-50/80`;
}

/**
 * Lazy expandable Division → City → Area tree for browse filters.
 */
export default function LocationFilterTree({
  selectedLocation,
  onSelectLocation,
}) {
  const selectedLocationId = selectedLocation?.id ?? null;

  const [divisions, setDivisions] = useState([]);
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
    setDivisions([]);
    setChildrenByParentId({});
    setExpandedIds([]);
    setLoadingKeys([]);
    setErrorKeys([]);
    loadedParentsRef.current = new Set();

    fetchLocationChildren()
      .then((rows) => {
        if (!cancelled) setDivisions(rows);
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
  }, []);

  const loadChildren = useCallback(async (parentId) => {
    if (loadedParentsRef.current.has(parentId)) return;
    loadedParentsRef.current.add(parentId);

    setLoadingKeys((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
    setErrorKeys((prev) => prev.filter((k) => k !== parentId));

    try {
      const rows = await fetchLocationChildren({ parentId });
      setChildrenByParentId((prev) => ({ ...prev, [parentId]: rows }));
    } catch {
      loadedParentsRef.current.delete(parentId);
      setErrorKeys((prev) =>
        prev.includes(parentId) ? prev : [...prev, parentId]
      );
    } finally {
      setLoadingKeys((prev) => prev.filter((k) => k !== parentId));
    }
  }, []);

  const toggleExpand = useCallback(
    async (loc, e) => {
      e?.stopPropagation?.();
      if (loc.level >= LEAF_LEVEL) return;
      const id = loc.id;
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
    async (loc) => {
      const toExpand = new Set();
      if (Array.isArray(loc.ancestors)) {
        for (const aid of loc.ancestors) toExpand.add(String(aid));
      }
      if (loc.parentId) toExpand.add(String(loc.parentId));
      if (loc.level < LEAF_LEVEL) toExpand.add(String(loc.id));

      if (toExpand.size === 0) return;

      setExpandedIds((prev) => [...new Set([...prev, ...toExpand])]);
      await Promise.all([...toExpand].map((parentId) => loadChildren(parentId)));
    },
    [loadChildren]
  );

  const handleLocationSelect = useCallback(
    async (loc) => {
      if (selectedLocationId === loc.id) {
        onSelectLocation(null);
        return;
      }

      onSelectLocation({
        id: loc.id,
        name: loc.name,
        level: loc.level,
      });

      await expandAncestors(loc);
    },
    [selectedLocationId, onSelectLocation, expandAncestors]
  );

  function renderNodes(locations, depth) {
    return locations.map((loc) => {
      const isLeaf = loc.level === LEAF_LEVEL;
      const isExpanded = expandedIds.includes(loc.id);
      const children = childrenByParentId[loc.id] ?? [];
      const isLoading = loadingKeys.includes(loc.id);
      const hasError = errorKeys.includes(loc.id);
      const isSelected = selectedLocationId === loc.id;
      const paddingLeft = 8 + depth * 12;

      return (
        <li key={loc.id}>
          <div className="flex items-center gap-0.5" style={{ paddingLeft }}>
            {!isLeaf ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(loc, e)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-primary hover:bg-zinc-100 shrink-0"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${loc.name}`}
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
              onClick={() => handleLocationSelect(loc)}
              className={rowClass(isSelected)}
              aria-current={isSelected ? "true" : undefined}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isSelected ? "bg-primary" : "bg-outline-variant"
                }`}
                aria-hidden
              />
              <span className="flex-1 truncate">{loc.name}</span>
              {isLoading ? (
                <MaterialIcon
                  name="progress_activity"
                  className="text-base animate-spin text-primary shrink-0"
                  aria-label="Loading locations"
                />
              ) : null}
            </button>
          </div>
          {hasError ? (
            <p
              className="text-xs text-red-600 py-1"
              style={{ paddingLeft: paddingLeft + 36 }}
            >
              Could not load sub-locations
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
        Loading locations…
      </p>
    );
  }

  if (rootError) {
    return (
      <p className="px-2 text-sm text-red-600">Could not load locations.</p>
    );
  }

  if (divisions.length === 0) {
    return (
      <p className="px-2 text-sm text-on-surface-variant">No locations found.</p>
    );
  }

  return (
    <div className="space-y-2">
      {selectedLocation?.name ? (
        <p className="px-2 text-xs text-primary font-medium">
          Filtering: {selectedLocation.name}
        </p>
      ) : null}
      <ul className="space-y-0.5 px-1">
        <li>
          <button
            type="button"
            onClick={() => onSelectLocation(null)}
            className={rowClass(!selectedLocationId)}
            style={{ paddingLeft: 8 }}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                !selectedLocationId ? "bg-primary" : "bg-outline-variant"
              }`}
              aria-hidden
            />
            <span>All locations</span>
          </button>
        </li>
        {renderNodes(divisions, 0)}
      </ul>
    </div>
  );
}
