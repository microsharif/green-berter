import { Link } from "react-router-dom";
import {
  badgeLabelForListing,
  exchangePriceLabel,
  isGive,
} from "./productUtils.js";

export default function ProductCardRelated({ product }) {
  const give = isGive(product.listingType);
  const priceLabel = exchangePriceLabel(product);

  return (
    <Link
      to={`/products/${product.id}`}
      className="bento-card group block cursor-pointer overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-container-low">
        <img
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          alt={product.title}
          src={product.imageUrl}
        />
        <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold uppercase text-on-primary">
          {badgeLabelForListing(product.listingType)}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-headline text-sm font-bold text-on-surface transition-colors group-hover:text-primary">
          {product.title}
        </h3>
        {!give && priceLabel ? (
          <p className="text-sm font-bold text-primary tabular-nums">{priceLabel}</p>
        ) : null}
        <p className="truncate text-xs text-on-surface-variant">{product.location}</p>
      </div>
    </Link>
  );
}
