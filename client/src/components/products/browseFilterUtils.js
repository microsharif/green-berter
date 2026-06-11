/** Slider max — values at this cap show all exchange listings (100+). */
export const BROWSE_PRICE_MAX = 100;

/** Browse grid page size (matches API `limit`). */
export const BROWSE_PAGE_SIZE = 20;

export const INITIAL_BROWSE_FILTERS = {
  query: "",
  action: "all",
  selectedCategory: null,
  selectedLocation: null,
  maxPrice: BROWSE_PRICE_MAX,
};

/** Number of non-default browse filters (for mobile badge). */
export function countActiveBrowseFilters(filters) {
  if (!filters) return 0;
  let count = 0;
  if ((filters.query || "").trim()) count += 1;
  if (filters.action && filters.action !== "all") count += 1;
  if (filters.selectedCategory) count += 1;
  if (filters.selectedLocation) count += 1;
  if (
    filters.action !== "give" &&
    Number(filters.maxPrice) < BROWSE_PRICE_MAX
  ) {
    count += 1;
  }
  return count;
}

/** Maps browse UI filters to `GET /listings` query params. */
export function buildBrowseFetchParams(filters, page = 0) {
  const params = {
    limit: BROWSE_PAGE_SIZE,
    offset: page * BROWSE_PAGE_SIZE,
  };

  const q = (filters.query || "").trim();
  if (q) params.search = q;

  if (filters.action === "give") params.listingType = "give";
  else if (filters.action === "exchange") params.listingType = "exchange";

  const location = filters.selectedLocation;
  if (location) {
    if (location.level === 2) params.areaId = String(location.id);
    else if (location.level === 1) params.cityName = String(location.name);
    else if (location.level === 0) params.divisionName = String(location.name);
  }

  if (filters.selectedCategory?.id) {
    params.categoryId = String(filters.selectedCategory.id);
  }

  const maxPrice = Number(filters.maxPrice);
  if (
    filters.action !== "give" &&
    Number.isFinite(maxPrice) &&
    maxPrice < BROWSE_PRICE_MAX
  ) {
    params.maxReferencePrice = maxPrice;
  }

  return params;
}
