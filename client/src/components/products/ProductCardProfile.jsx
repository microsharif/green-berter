import { Link } from "react-router-dom";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { exchangePriceLabel, isGive } from "./productUtils.js";

export default function ProductCardProfile({ product, onEdit }) {
  const give = isGive(product.listingType);
  const priceLabel = exchangePriceLabel(product);

  return (
    <div className="relative group/card">
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="group/edit absolute top-3 right-3 z-20 flex items-center gap-0 overflow-hidden rounded-full bg-white/95 text-green-800 shadow-md border border-green-800/10 pl-2.5 pr-2.5 py-2 hover:bg-white hover:pr-3.5 transition-all duration-200"
          aria-label={`Edit ${product.title}`}
        >
          <MaterialIcon name="edit" className="text-lg shrink-0" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold opacity-0 group-hover/edit:max-w-[3.5rem] group-hover/edit:opacity-100 group-hover/edit:ml-1.5 transition-all duration-200">
            Edit
          </span>
        </button>
      ) : null}

      <Link
        to={`/products/${product.id}`}
        className="group bg-surface-container-lowest rounded-2xl overflow-hidden hover:bg-surface-container-high transition-all duration-300 block"
      >
        <div className="h-64 overflow-hidden">
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            alt={product.title}
            src={product.imageUrl}
          />
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-start gap-2 pr-10">
            <h3 className="text-lg font-bold text-on-surface">{product.title}</h3>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${give ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}
              >
                {give ? "FREE" : "EXCHANGE"}
              </span>
              {!give && priceLabel ? (
                <span className="text-sm font-bold text-secondary tabular-nums">
                  {priceLabel}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-zinc-500 line-clamp-2">
            {product.shortDescription}
          </p>
          <div className="flex items-center gap-2 pt-2">
            <MaterialIcon name="location_on" className="text-sm text-zinc-400" />
            <span className="text-xs text-zinc-400">{product.location}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
