import { useMemo, useState } from "react";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { badgeLabelForListing, isGive } from "../products/productUtils.js";

export default function ProductDetailGallery({ product }) {
  const images = useMemo(() => {
    const main = product.imageUrl;
    const extras = product.gallery?.secondary ?? [];
    return [main, ...extras.filter((url) => url && url !== main)];
  }, [product.imageUrl, product.gallery?.secondary]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? product.imageUrl;
  const give = isGive(product.listingType);
  const hasMultiple = images.length > 1;

  function showPrevious() {
    setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }

  function showNext() {
    setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  return (
    <section className="space-y-4">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-low group">
        <img
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          alt={product.gallery?.heroAlt || product.title}
          src={activeImage}
        />
        <div className="absolute top-4 left-4">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              give
                ? "bg-primary text-on-primary"
                : "bg-primary text-on-primary"
            }`}
          >
            {badgeLabelForListing(product.listingType)}
          </span>
        </div>
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 border border-outline-variant/30 shadow-md flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <MaterialIcon name="chevron_left" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 border border-outline-variant/30 shadow-md flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <MaterialIcon name="chevron_right" />
            </button>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                index === activeIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-outline-variant/30 hover:border-primary/40"
              }`}
              aria-label={`Show image ${index + 1}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
