import { Link } from "react-router-dom";
import ProductBadge from "../ui/ProductBadge.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import {
  badgeVariantForListing,
  exchangePriceLabel,
  featuredBadgeLabel,
  isGive,
} from "./productUtils.js";

export default function ProductCardFeatured({ product }) {
  const give = isGive(product.listingType);
  const priceLabel = exchangePriceLabel(product);
  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-surface-container-lowest rounded-3xl overflow-hidden hover:bg-surface-container-high transition-colors block"
    >
      <div className="relative aspect-square overflow-hidden m-2 rounded-2xl">
        <img
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          alt={product.title}
          src={product.imageUrl}
        />
        <div className="absolute top-4 left-4">
          <ProductBadge variant={badgeVariantForListing(product.listingType)}>
            {featuredBadgeLabel(product.listingType)}
          </ProductBadge>
        </div>
      </div>
      <div className="p-6">
        <h4 className="font-bold text-lg mb-1">{product.title}</h4>
        {!give && priceLabel ? (
          <p className="text-sm font-bold text-secondary tabular-nums mb-1">
            {priceLabel}
          </p>
        ) : null}
        <p className="text-sm text-on-surface-variant mb-4">{product.location}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-200" />
            <span className="text-xs font-medium">Member</span>
          </div>
          <span
            className={`p-2 rounded-full inline-flex ${give ? "hover:bg-primary-fixed" : "hover:bg-secondary-fixed"} transition-colors`}
          >
            <MaterialIcon name={give ? "favorite" : "sync"} />
          </span>
        </div>
      </div>
    </Link>
  );
}
