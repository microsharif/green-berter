import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchRelatedListingsByCategory,
  fetchRelatedListingsByPrice,
} from "../../api/listings.js";
import { apiListingToCatalogProduct } from "../../data/listingAdapter.js";
import { isMongoListingId } from "./claimUtils.js";
import ProductCardRelated from "../products/ProductCardRelated.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import {
  getProductCategoryId,
  getReferencePrice,
  isGive,
  relatedExchangePriceRangeLabel,
} from "../products/productUtils.js";

function relatedSubtitle(product) {
  if (isGive(product.listingType)) {
    const name = product.categoryName?.trim();
    return name
      ? `Other free listings in ${name}`
      : "Other free listings in the same category";
  }
  const priceLabel = relatedExchangePriceRangeLabel(getReferencePrice(product));
  return priceLabel
    ? `Other exchange listings with a similar estimated value (${priceLabel})`
    : "Other exchange listings with a similar estimated value";
}

export default function ProductRelatedSection({ product }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) {
      setRelated([]);
      return;
    }

    const give = isGive(product.listingType);
    const price = give ? null : getReferencePrice(product);
    const categoryId = give ? getProductCategoryId(product) : null;

    if (give && !categoryId) {
      setRelated([]);
      return;
    }
    if (!give && price == null) {
      setRelated([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const excludeId = isMongoListingId(product.id) ? product.id : undefined;
    const request = give
      ? fetchRelatedListingsByCategory({ categoryId, excludeId })
      : fetchRelatedListingsByPrice({ referencePrice: price, excludeId });

    request
      .then(({ listings }) => {
        if (cancelled) return;
        setRelated(
          listings.map(apiListingToCatalogProduct).filter(Boolean)
        );
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!loading && !related.length) return null;

  return (
    <section className="mt-16 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="detail-section-heading font-headline text-xl font-bold text-on-surface md:text-2xl">
            Related products
          </h2>
          <p className="mt-2 pl-5 text-sm text-on-surface-variant">
            {relatedSubtitle(product)}
          </p>
        </div>
        <Link
          to="/products"
          className="flex items-center gap-2 text-sm font-bold text-primary transition-all hover:gap-3"
        >
          View all listings
          <MaterialIcon name="arrow_forward" />
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-on-surface-variant">Finding similar listings…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((p) => (
            <ProductCardRelated key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
