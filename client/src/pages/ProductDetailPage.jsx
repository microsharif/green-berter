import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { fetchListing } from "../api/listings.js";
import { apiListingToCatalogProduct } from "../data/listingAdapter.js";
import { useProductClaims } from "../hooks/useProductClaims.js";
import { isMongoListingId } from "../components/productDetail/claimUtils.js";
import MaterialIcon from "../components/ui/MaterialIcon.jsx";
import ProductDetailGallery from "../components/productDetail/ProductDetailGallery.jsx";
import ProductDetailHeader from "../components/productDetail/ProductDetailHeader.jsx";
import ProductDetailNarrative from "../components/productDetail/ProductDetailNarrative.jsx";
import ProductSellerCard from "../components/productDetail/ProductSellerCard.jsx";
import ProductExchangeAside from "../components/productDetail/ProductExchangeAside.jsx";
import ProductRelatedSection from "../components/productDetail/ProductRelatedSection.jsx";
import ProductLocationMap from "../components/productDetail/ProductLocationMap.jsx";

function productFromState(state, productId) {
  const p = state?.product;
  if (!p || !productId) return null;
  return String(p.id) === String(productId) ? p : null;
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const claimsFocus = searchParams.get("claims");
  const { getProductById, loading: catalogLoading } = useCatalog();
  const { user, isAuthenticated, isReady: authReady } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const claimsAsideRef = useRef(null);

  const fromCatalog = productId ? getProductById(productId) : null;
  const fromState = productFromState(location.state, productId);

  const [fetched, setFetched] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState(false);

  const baseProduct = fromCatalog || fromState || fetched;
  const [liveProduct, setLiveProduct] = useState(null);
  const apiEnabled = isMongoListingId(productId);

  const loadListingFromApi = useCallback(async () => {
    if (!productId || !isMongoListingId(productId)) return null;
    const api = await fetchListing(productId);
    return api ? apiListingToCatalogProduct(api) : null;
  }, [productId]);

  useEffect(() => {
    if (baseProduct) setLiveProduct(baseProduct);
  }, [baseProduct]);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    loadListingFromApi()
      .then((p) => {
        if (!cancelled && p) setLiveProduct(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiEnabled, loadListingFromApi]);

  useEffect(() => {
    if (fromCatalog || fromState || catalogLoading || !productId) return;
    if (!isMongoListingId(productId)) return;

    let cancelled = false;
    setFetching(true);
    setFetchErr(false);
    loadListingFromApi()
      .then((p) => {
        if (!cancelled) setFetched(p);
      })
      .catch(() => {
        if (!cancelled) setFetchErr(true);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCatalog, fromState, catalogLoading, productId, loadListingFromApi]);

  const product = liveProduct;
  const isOwner =
    apiEnabled &&
    isAuthenticated &&
    user?.id &&
    product?.ownerUserId &&
    String(user.id) === String(product.ownerUserId);

  const {
    claims,
    myClaim,
    loading: claimsLoading,
    refresh: refreshClaims,
  } = useProductClaims(productId, {
    enabled: apiEnabled && authReady && isAuthenticated,
    userId: user?.id,
  });

  const refreshAll = useCallback(async () => {
    await refreshClaims();
    await refreshNotifications();
    if (apiEnabled) {
      try {
        const updated = await loadListingFromApi();
        if (updated) setLiveProduct(updated);
      } catch {
        /* listing refresh is best-effort */
      }
    }
  }, [refreshClaims, refreshNotifications, apiEnabled, loadListingFromApi]);

  useEffect(() => {
    if (!claimsFocus || !product) return;
    requestAnimationFrame(() => {
      claimsAsideRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [claimsFocus, product?.id]);

  const asideProps = useMemo(
    () => ({
      product,
      claims,
      claimsLoading,
      myClaim,
      isOwner,
      apiEnabled,
      onRefresh: refreshAll,
      claimsFocus,
    }),
    [
      product,
      claims,
      claimsLoading,
      myClaim,
      isOwner,
      apiEnabled,
      refreshAll,
      claimsFocus,
    ]
  );

  if (!product) {
    if (catalogLoading || fetching) {
      return (
        <main className="pt-32 pb-20 max-w-[1280px] mx-auto px-4 md:px-16 text-center bg-background">
          <p className="text-on-surface-variant">Loading listing…</p>
        </main>
      );
    }
    return (
      <main className="pt-32 pb-20 max-w-[1280px] mx-auto px-4 md:px-16 text-center bg-background">
        <h1 className="text-3xl font-bold text-on-surface mb-4">Listing not found</h1>
        <p className="text-on-surface-variant mb-8">
          {fetchErr
            ? "We couldn't load this item. Please try again."
            : "This item may have been claimed or removed."}
        </p>
        <Link
          to="/products"
          className="text-primary font-bold underline hover:no-underline"
        >
          Back to catalog
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-20 max-w-[1280px] mx-auto px-4 md:px-16 bg-background font-body text-on-surface antialiased">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"
      >
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <MaterialIcon name="chevron_right" className="text-base" aria-hidden />
        <Link to="/products" className="hover:text-primary transition-colors">
          Browse
        </Link>
        <MaterialIcon name="chevron_right" className="text-base" aria-hidden />
        <span className="text-primary font-semibold truncate max-w-[14rem] sm:max-w-md">
          {product.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-16 items-start">
        <div className="lg:col-span-7">
          <ProductDetailGallery product={product} />
        </div>

        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28 self-start">
          <ProductDetailHeader product={product} />
          <div ref={claimsAsideRef} className="scroll-mt-28">
            <ProductExchangeAside {...asideProps} />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ProductDetailNarrative product={product} />
        <ProductSellerCard seller={product.seller} />
      </div>

      <ProductLocationMap product={product} />
      <ProductRelatedSection product={product} />
    </main>
  );
}
