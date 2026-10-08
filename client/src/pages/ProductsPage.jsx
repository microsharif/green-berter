import ProductListHero from "../components/products/ProductListHero.jsx";
import ProductFiltersSidebar from "../components/products/ProductFiltersSidebar.jsx";
import ProductBrowseMobileFilters from "../components/products/ProductBrowseMobileFilters.jsx";
import ProductCatalogGrid from "../components/products/ProductCatalogGrid.jsx";
import useApplyBrowseUrlParams from "../hooks/useApplyBrowseUrlParams.js";

export default function ProductsPage() {
  useApplyBrowseUrlParams();

  return (
    <main className="pt-2 min-h-screen bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      <div className="max-w-screen-2xl mx-auto px-6">
        <ProductListHero />
        <div className="flex flex-col lg:flex-row gap-12">
          <ProductFiltersSidebar />
          <div className="flex-grow min-w-0">
            <ProductBrowseMobileFilters />
            <ProductCatalogGrid />
          </div>
        </div>
      </div>
    </main>
  );
}
