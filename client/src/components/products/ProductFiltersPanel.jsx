import { Link } from "react-router-dom";
import { BROWSE_PRICE_MAX, useCatalog } from "../../context/CatalogContext.jsx";
import CategoryFilterCascade from "./CategoryFilterCascade.jsx";
import LocationFilterSearch from "./LocationFilterSearch.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

/**
 * Shared browse filter controls — used in desktop sidebar and mobile drawer.
 */
export default function ProductFiltersPanel({ showPostLink = true, onNavigate }) {
  const {
    browseFilters,
    setBrowseQuery,
    setBrowseAction,
    setBrowseCategory,
    setBrowseLocation,
    setBrowseMaxPrice,
  } = useCatalog();

  const maxPrice = browseFilters.maxPrice ?? BROWSE_PRICE_MAX;
  const maxPriceLabel =
    maxPrice >= BROWSE_PRICE_MAX ? "100+" : String(maxPrice);

  const showPriceFilter = browseFilters.action !== "give";
  const listingTypeForCategories =
    browseFilters.action === "give" || browseFilters.action === "exchange"
      ? browseFilters.action
      : null;

  return (
    <div className="space-y-10">
      <div className="bg-surface-container-low p-4 rounded-xl">
        <label className="block text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-3">
          Quick Search
        </label>
        <div className="relative">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
          />
          <input
            className="w-full bg-surface-container-lowest border-none rounded-lg pl-10 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
            placeholder="Find resources..."
            type="search"
            value={browseFilters.query}
            onChange={(e) => setBrowseQuery(e.target.value)}
          />
        </div>
      </div>
      <nav className="flex flex-col space-y-8">
        <div>
          <h3 className="font-headline font-bold text-sm mb-4 px-2">
            Action Type
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setBrowseAction("give")}
              className={`w-full flex items-center gap-3 rounded-full px-4 py-3 font-semibold Inter transition-transform ${
                browseFilters.action === "give"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 translate-x-1"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              <MaterialIcon name="redeem" className="text-lg" />
              <span>Give</span>
            </button>
            <button
              type="button"
              onClick={() => setBrowseAction("exchange")}
              className={`w-full flex items-center gap-3 rounded-full px-4 py-3 font-semibold Inter transition-colors ${
                browseFilters.action === "exchange"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 translate-x-1"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              <MaterialIcon name="sync_alt" className="text-lg" />
              <span>Exchange</span>
            </button>
            <button
              type="button"
              onClick={() => setBrowseAction("all")}
              className="w-full text-left text-xs text-on-surface-variant px-4 pt-2 hover:text-primary"
            >
              Show all listings
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-headline font-bold text-sm mb-4 px-2">
            Location
          </h3>
          <div className="px-1">
            <LocationFilterSearch
              selectedLocation={browseFilters.selectedLocation}
              onSelectLocation={setBrowseLocation}
            />
          </div>
        </div>

        <div>
          <h3 className="font-headline font-bold text-sm mb-4 px-2">
            Categories
          </h3>
          {!listingTypeForCategories ? (
            <p className="px-2 text-sm text-on-surface-variant">
              Select Give or Exchange to browse categories.
            </p>
          ) : (
            <div className="px-1">
              <CategoryFilterCascade
                listingType={listingTypeForCategories}
                selectedCategory={browseFilters.selectedCategory}
                onSelectCategory={setBrowseCategory}
              />
            </div>
          )}
        </div>

        {showPriceFilter ? (
          <div>
            <h3 className="font-headline font-bold text-sm mb-4 px-2">
              Price (BDT)
            </h3>
            <input
              className="w-full h-1 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              type="range"
              min="0"
              max={BROWSE_PRICE_MAX}
              value={maxPrice}
              onChange={(e) => setBrowseMaxPrice(e.target.value)}
              aria-valuemin={0}
              aria-valuemax={BROWSE_PRICE_MAX}
              aria-valuenow={maxPrice}
              aria-label="Maximum price in BDT"
            />
            <div className="flex justify-between mt-2 text-xs font-medium text-outline">
              <span>0</span>
              <span>{maxPriceLabel}</span>
            </div>
          </div>
        ) : null}
      </nav>
      {showPostLink ? (
        <Link
          to="/upload?mode=give"
          onClick={onNavigate}
          className="block w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold font-headline shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all text-center"
        >
          Post an Item
        </Link>
      ) : null}
    </div>
  );
}
