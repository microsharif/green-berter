import MaterialIcon from "../ui/MaterialIcon.jsx";
import {
  badgeLabelForListing,
  exchangePriceLabel,
  isGive,
} from "../products/productUtils.js";

export default function ProductDetailHeader({ product }) {
  const give = isGive(product.listingType);
  const priceLabel = exchangePriceLabel(product);

  return (
    <div className="space-y-2">
      <span className="block font-headline text-xl sm:text-2xl font-bold text-primary">
        {give ? badgeLabelForListing(product.listingType) : priceLabel || "Exchange"}
      </span>
      <h1 className="font-headline text-2xl sm:text-[2rem] font-bold text-on-surface leading-tight">
        {product.title}
      </h1>
      <p className="flex items-center gap-2 text-sm text-on-surface-variant">
        <MaterialIcon name="location_on" className="text-lg shrink-0" />
        {product.location}
      </p>
    </div>
  );
}
