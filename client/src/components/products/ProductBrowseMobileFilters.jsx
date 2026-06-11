import { useId, useState } from "react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import {
  countActiveBrowseFilters,
  INITIAL_BROWSE_FILTERS,
} from "./browseFilterUtils.js";
import ProductFiltersPanel from "./ProductFiltersPanel.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function filterSummaryLabel(browseFilters, activeCount) {
  if (activeCount === 0) return "All listings — tap to filter";
  const parts = [];
  if (browseFilters.action === "give") parts.push("Give");
  else if (browseFilters.action === "exchange") parts.push("Exchange");
  if (browseFilters.selectedLocation?.name) {
    parts.push(browseFilters.selectedLocation.name);
  }
  if (browseFilters.selectedCategory?.name) {
    parts.push(browseFilters.selectedCategory.name);
  }
  if ((browseFilters.query || "").trim()) parts.push("Search");
  if (parts.length) return parts.join(" · ");
  return `${activeCount} filter${activeCount === 1 ? "" : "s"} applied`;
}

/**
 * Mobile browse filters — collapsible dropdown below the grid (not a side drawer).
 */
export default function ProductBrowseMobileFilters() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();
  const { browseFilters, setBrowseFilters } = useCatalog();

  const activeCount = countActiveBrowseFilters(browseFilters);
  const summary = filterSummaryLabel(browseFilters, activeCount);

  function clearFilters() {
    setBrowseFilters({ ...INITIAL_BROWSE_FILTERS });
  }

  return (
    <div className="lg:hidden mb-6">
      <label
        htmlFor={buttonId}
        className="block text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-2"
      >
        Filters
      </label>

      <div
        className={`rounded-xl border bg-surface-container-lowest transition-[border-color,box-shadow] ${
          open
            ? "border-primary/40 shadow-sm shadow-primary/10"
            : "border-outline-variant"
        }`}
      >
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-on-surface hover:bg-surface-container-low/80 transition-colors"
        >
          <MaterialIcon
            name="tune"
            className="shrink-0 text-lg text-on-surface-variant"
            aria-hidden
          />
          <span className="flex-1 min-w-0 truncate">{summary}</span>
          {activeCount > 0 ? (
            <span className="shrink-0 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold px-1.5">
              {activeCount}
            </span>
          ) : null}
          <MaterialIcon
            name="expand_more"
            className={`shrink-0 text-xl text-on-surface-variant transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          aria-hidden={!open}
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div
            className={`min-h-0 ${open ? "overflow-visible" : "overflow-hidden"}`}
          >
            <div className="border-t border-outline-variant/60 px-4 pb-5 pt-4">
              {activeCount > 0 ? (
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : null}
              <ProductFiltersPanel
                showPostLink
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
