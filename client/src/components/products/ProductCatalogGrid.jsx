import { useCatalog } from "../../context/CatalogContext.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import SkeuomorphicPagination from "../ui/SkeuomorphicPagination.jsx";
import ProductCardListing from "./ProductCardListing.jsx";

function formatLoadError(err) {
  if (!err) return "Could not load listings.";
  if (err.message) return err.message;
  return String(err);
}

export default function ProductCatalogGrid() {
  const {
    filteredProducts,
    loading,
    loadError,
    browsePage,
    browseTotal,
    browseTotalPages,
    setBrowsePage,
  } = useCatalog();

  const isInitialLoad = loading && filteredProducts.length === 0;

  if (isInitialLoad) {
    return (
      <RevealOnScroll className="flex-grow pb-20 flex items-center justify-center min-h-[40vh] text-on-surface-variant gap-2">
        <MaterialIcon name="progress_activity" className="animate-spin text-primary" />
        Loading listings…
      </RevealOnScroll>
    );
  }

  if (loadError) {
    return (
      <RevealOnScroll className="flex-grow pb-20">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <div className="flex items-start gap-3">
            <MaterialIcon name="warning" className="text-2xl shrink-0" />
            <div>
              <h3 className="font-headline font-bold">Could not load listings</h3>
              <p className="mt-2 text-sm">{formatLoadError(loadError)}</p>
              <p className="mt-2 text-xs text-amber-800/90">
                Check that the API is running and refresh the page.
              </p>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    );
  }

  if (!filteredProducts.length) {
    return (
      <RevealOnScroll className="flex-grow pb-20 flex items-center justify-center min-h-[40vh] text-on-surface-variant">
        No listings match your filters yet.
      </RevealOnScroll>
    );
  }

  return (
    <div className="flex-grow pb-20">
      <div className="relative min-h-[280px]">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/75 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
            aria-label="Loading listings"
          >
            <MaterialIcon
              name="progress_activity"
              className="animate-spin text-3xl text-primary"
            />
            <span className="text-sm font-medium text-on-surface-variant">
              Loading page…
            </span>
          </div>
        ) : null}

        <div
          className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 transition-opacity duration-200 ${
            loading ? "opacity-40 pointer-events-none" : "opacity-100"
          }`}
          aria-busy={loading}
        >
          {filteredProducts.map((p, index) => (
            <RevealOnScroll key={p.id} delay={(index % 6) * 70}>
              <ProductCardListing product={p} />
            </RevealOnScroll>
          ))}
        </div>
      </div>

      {browseTotalPages > 1 ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <SkeuomorphicPagination
            page={browsePage}
            totalPages={browseTotalPages}
            total={browseTotal}
            loading={loading}
            onPageChange={setBrowsePage}
          />
          <p className="text-xs text-on-surface-variant tabular-nums">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <MaterialIcon
                  name="progress_activity"
                  className="animate-spin text-sm text-primary"
                />
                Loading page {browsePage + 1}…
              </span>
            ) : (
              <>
                Page {browsePage + 1} of {browseTotalPages} · {browseTotal} listing
                {browseTotal === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
