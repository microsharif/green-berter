import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BROWSE_PRICE_MAX,
  INITIAL_BROWSE_FILTERS,
} from "../components/products/browseFilterUtils.js";
import { useCatalog } from "../context/CatalogContext.jsx";
import { getFeaturedCategoryById } from "../constants/featuredCategories.js";
import {
  resolveBrowseCategoryAcrossTypes,
  resolveBrowseCategoryById,
} from "../utils/resolveBrowseCategory.js";

/**
 * Syncs browse filters with the products URL.
 * - `/products` (no query) → reset to defaults (e.g. Browse menu link)
 * - `/products?featured=…` or `?categoryId=…` → apply that filter
 */
export default function useApplyBrowseUrlParams() {
  const [searchParams] = useSearchParams();
  const { setBrowseFilters } = useCatalog();

  useEffect(() => {
    const featuredId = searchParams.get("featured");
    const categoryId = searchParams.get("categoryId");

    if (!featuredId && !categoryId) {
      setBrowseFilters({
        ...INITIAL_BROWSE_FILTERS,
        maxPrice: BROWSE_PRICE_MAX,
      });
      return undefined;
    }

    let cancelled = false;

    async function apply() {
      try {
        if (featuredId) {
          const config = getFeaturedCategoryById(featuredId);
          if (!config) return;

          const selectedCategory = await resolveBrowseCategoryAcrossTypes(config);
          if (cancelled || !selectedCategory) return;

          setBrowseFilters({
            ...INITIAL_BROWSE_FILTERS,
            action: "all",
            selectedCategory,
            maxPrice: BROWSE_PRICE_MAX,
          });
          return;
        }

        const { category, listingType } = await resolveBrowseCategoryById(categoryId);
        if (cancelled || !category) return;

        setBrowseFilters({
          ...INITIAL_BROWSE_FILTERS,
          action: listingType ?? "all",
          selectedCategory: category,
          maxPrice: BROWSE_PRICE_MAX,
        });
      } catch {
        /* leave current filters unchanged */
      }
    }

    apply();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setBrowseFilters]);
}
