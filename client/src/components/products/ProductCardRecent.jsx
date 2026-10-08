import { Link } from "react-router-dom";
import {
  formatReferencePriceAmount,
  getReferencePrice,
  isGive,
} from "./productUtils.js";

function estimatedValueLabel(product) {
  if (isGive(product.listingType)) {
    return "Estimated value: Free";
  }
  const amount = getReferencePrice(product);
  const formatted = formatReferencePriceAmount(amount);
  if (formatted == null) return "Estimated value: —";
  return `Estimated value: BDT ${formatted}`;
}

export default function ProductCardRecent({ product }) {
  const category =
    product.categoryName?.trim() ||
    product.categoryPath?.split(" › ").pop()?.trim() ||
    "Uncategorized";

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block h-full bg-white rounded-lg border border-outline-variant/20 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-container-low">
        <img
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          alt={product.title}
          src={product.imageUrl}
        />
      </div>
      <div className="p-4 space-y-1">
        <p className="text-sm font-bold text-primary tabular-nums">
          {estimatedValueLabel(product)}
        </p>
        <p className="text-xs text-on-surface-variant line-clamp-1">{category}</p>
        <h3 className="font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>
      </div>
    </Link>
  );
}
