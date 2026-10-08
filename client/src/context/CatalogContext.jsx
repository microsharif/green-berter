import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchListings } from "../api/listings.js";
import { apiListingToCatalogProduct } from "../data/listingAdapter.js";
import {
  BROWSE_PAGE_SIZE,
  BROWSE_PRICE_MAX,
  buildBrowseFetchParams,
} from "../components/products/browseFilterUtils.js";

export { BROWSE_PRICE_MAX } from "../components/products/browseFilterUtils.js";

/** Home recent-listings slider — newest from the API (already sorted newest-first). */
const FEATURED_COUNT = 12;

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [browseListings, setBrowseListings] = useState([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(0);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const productCacheRef = useRef(new Map());
  const browseRequestIdRef = useRef(0);

  const [browseFilters, setBrowseFilters] = useState({
    query: "",
    action: "all",
    selectedCategory: null,
    selectedLocation: null,
    maxPrice: BROWSE_PRICE_MAX,
  });

  const cacheProducts = useCallback((products) => {
    const map = productCacheRef.current;
    for (const p of products) {
      map.set(p.id, p);
    }
  }, []);

  const loadFeatured = useCallback(async () => {
    try {
      const { listings } = await fetchListings({ limit: FEATURED_COUNT });
      const products = listings.map(apiListingToCatalogProduct).filter(Boolean);
      setFeaturedListings(products);
      cacheProducts(products);
    } catch {
      setFeaturedListings([]);
    }
  }, [cacheProducts]);

  const loadBrowsePage = useCallback(
    async (filters, page) => {
      const requestId = ++browseRequestIdRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const params = buildBrowseFetchParams(filters, page);
        const { listings, total } = await fetchListings(params);
        if (requestId !== browseRequestIdRef.current) return;

        const products = listings.map(apiListingToCatalogProduct).filter(Boolean);
        setBrowseListings(products);
        setBrowseTotal(total);
        cacheProducts(products);

        const totalPages = total === 0 ? 0 : Math.ceil(total / BROWSE_PAGE_SIZE);
        const maxPage = Math.max(0, totalPages - 1);
        if (page > maxPage) {
          setBrowsePage(maxPage);
        }
      } catch (err) {
        if (requestId !== browseRequestIdRef.current) return;
        setLoadError(err);
        setBrowseListings([]);
        setBrowseTotal(0);
      } finally {
        if (requestId === browseRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [cacheProducts]
  );

  /**
   * Re-fetch featured + current browse page. Called on mount, after a new
   * listing is posted, and after an edit / delete.
   */
  const refreshListings = useCallback(async () => {
    setBrowsePage(0);
    await loadFeatured();
    await loadBrowsePage(browseFilters, 0);
  }, [browseFilters, loadBrowsePage, loadFeatured]);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    loadBrowsePage(browseFilters, browsePage);
  }, [browseFilters, browsePage, loadBrowsePage]);

  const products = browseListings;

  const getProductById = useCallback((id) => {
    return productCacheRef.current.get(String(id)) ?? null;
  }, []);

  const featuredProducts = featuredListings;

  const filteredProducts = browseListings;

  const browseTotalPages = useMemo(
    () => (browseTotal === 0 ? 0 : Math.ceil(browseTotal / BROWSE_PAGE_SIZE)),
    [browseTotal]
  );

  const setBrowseQuery = useCallback((query) => {
    setBrowsePage(0);
    setBrowseFilters((f) => ({ ...f, query }));
  }, []);

  const setBrowseAction = useCallback((action) => {
    setBrowsePage(0);
    setBrowseFilters((f) => ({
      ...f,
      action,
      selectedCategory: null,
    }));
  }, []);

  /** @param {{ id: string, name: string, level: number, categoryIds?: string[] } | null} category */
  const setBrowseCategory = useCallback((category) => {
    setBrowsePage(0);
    setBrowseFilters((f) => ({
      ...f,
      selectedCategory: category
        ? {
            id: String(category.id),
            name: String(category.name),
            level: Number(category.level),
            ...(Array.isArray(category.categoryIds) && category.categoryIds.length
              ? {
                  categoryIds: category.categoryIds.map(String),
                }
              : {}),
          }
        : null,
    }));
  }, []);

  /** @param {{ id: string, name: string, level: number } | null} location */
  const setBrowseLocation = useCallback((location) => {
    setBrowsePage(0);
    setBrowseFilters((f) => ({
      ...f,
      selectedLocation: location
        ? {
            id: String(location.id),
            name: String(location.name),
            level: Number(location.level),
          }
        : null,
    }));
  }, []);

  const setBrowseMaxPrice = useCallback((maxPrice) => {
    setBrowsePage(0);
    const n = Number(maxPrice);
    setBrowseFilters((f) => ({
      ...f,
      maxPrice: Number.isFinite(n)
        ? Math.min(BROWSE_PRICE_MAX, Math.max(0, Math.round(n)))
        : BROWSE_PRICE_MAX,
    }));
  }, []);

  const applyBrowseFilters = useCallback((next) => {
    setBrowsePage(0);
    setBrowseFilters(next);
  }, []);

  const value = useMemo(
    () => ({
      products,
      featuredProducts,
      filteredProducts,
      browseFilters,
      browsePage,
      browseTotal,
      browseTotalPages,
      setBrowsePage,
      setBrowseFilters: applyBrowseFilters,
      setBrowseQuery,
      setBrowseAction,
      setBrowseCategory,
      setBrowseLocation,
      setBrowseMaxPrice,
      getProductById,
      refreshListings,
      loading,
      loadError,
    }),
    [
      products,
      featuredProducts,
      filteredProducts,
      browseFilters,
      browsePage,
      browseTotal,
      browseTotalPages,
      setBrowseQuery,
      setBrowseAction,
      setBrowseCategory,
      setBrowseLocation,
      setBrowseMaxPrice,
      getProductById,
      refreshListings,
      loading,
      loadError,
    ]
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return ctx;
}

export function useProduct(productId) {
  const { getProductById } = useCatalog();
  return useMemo(
    () => (productId ? getProductById(productId) : null),
    [getProductById, productId]
  );
}
