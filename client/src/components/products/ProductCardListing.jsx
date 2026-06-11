import { Link } from "react-router-dom";
import ProductBadge from "../ui/ProductBadge.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import {
  badgeLabelForListing,
  badgeVariantForListing,
  exchangePriceLabel,
  isGive,
} from "./productUtils.js";

export default function ProductCardListing({ product }) {
  const give = isGive(product.listingType);
  const priceLabel = exchangePriceLabel(product);

  return (
    <div className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:bg-surface-container-high transition-all duration-300">
      <div className="aspect-[4/5] relative m-2 rounded-lg overflow-hidden">
        <img
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={product.title}
          src={product.imageUrl}
        />
        <div className="absolute top-4 left-4">
          <ProductBadge
            variant={badgeVariantForListing(product.listingType, "listing")}
            className="px-4 py-1.5"
          >
            {badgeLabelForListing(product.listingType)}
          </ProductBadge>
        </div>
      </div>
      <div className="p-6 pt-2">
        <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        {!give && priceLabel ? (
          <p className="mt-1 text-sm font-bold text-secondary tabular-nums">
            {priceLabel}
          </p>
        ) : null}
        <div className="flex items-center gap-2 mt-2 text-on-surface-variant text-sm">
          <MaterialIcon name="location_on" className="text-base" />
          <span>{product.location}</span>
        </div>
        <Link
          to={`/products/${product.id}`}
          className="mt-6 w-full py-3 border border-outline-variant hover:border-primary hover:text-primary transition-all rounded-full text-sm font-bold font-headline inline-block text-center"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
