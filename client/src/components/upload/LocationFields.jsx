import { useEffect, useState } from "react";
import { fetchLocationChildren } from "../../api/locations.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const LOCATION_LABELS = ["Division", "City", "Area"];

/**
 * Single dropdown in the Division → City → Area cascade.
 */
export function LocationLevel({
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
    setOptions([]);
    setLoading(true);
    setErrored(false);
    fetchLocationChildren({ parentId })
      .then((locs) => {
        if (!cancelled) setOptions(locs);
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
  }, [parentId]);

  const selectId = `location-select-${levelIndex}`;

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
          disabled={errored || options.length === 0}
          onChange={(e) => {
            const idVal = e.target.value || null;
            const picked = options.find((o) => o.id === idVal) ?? null;
            onChange(
              picked
                ? {
                    id: picked.id,
                    name: picked.name,
                    level: picked.level,
                    latitude: picked.latitude,
                    longitude: picked.longitude,
                  }
                : null
            );
          }}
        >
          <option value="">
            {errored
              ? "Failed to load — try again or refresh"
              : options.length === 0
                ? "No locations"
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
          Could not load locations. Check your connection and reload the page.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Division → City → Area cascading selects.
 */
export function LocationCascade({ locationPath, onSelectAtDepth }) {
  const lastPicked = locationPath[locationPath.length - 1];
  const reachedLeaf = lastPicked?.level === 2;
  const slotsToShow = reachedLeaf
    ? locationPath.length
    : locationPath.length + 1;

  return (
    <div className="space-y-4">
      {Array.from({ length: slotsToShow }).map((_, depth) => {
        const parentId =
          depth === 0 ? null : locationPath[depth - 1]?.id ?? null;
        const picked = locationPath[depth] ?? null;
        return (
          <LocationLevel
            key={`loc:${depth}:${parentId ?? "root"}`}
            parentId={parentId}
            levelIndex={depth}
            value={picked?.id ?? ""}
            label={LOCATION_LABELS[depth] ?? `Level ${depth + 1}`}
            onChange={(selection) => onSelectAtDepth(depth, selection)}
          />
        );
      })}
    </div>
  );
}
