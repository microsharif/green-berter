export function isGive(listingType) {
  return listingType === "give";
}

export function badgeVariantForListing(listingType, layout = "default") {
  if (layout === "listing") {
    return isGive(listingType) ? "giveAlt" : "exchangeAlt";
  }
  if (layout === "compact") {
    return isGive(listingType) ? "compactGive" : "compactExchange";
  }
  return isGive(listingType) ? "give" : "exchange";
}

export function badgeLabelForListing(listingType) {
  return isGive(listingType) ? "Free" : "Exchange";
}

export function featuredBadgeLabel(listingType) {
  return isGive(listingType) ? "Free" : "Exchange Available";
}

/** Leaf category id for give/exchange listings, or null. */
export function getProductCategoryId(product) {
  if (!product) return null;
  const raw = product.categoryId ?? product._api?.categoryId;
  if (raw == null || raw === "") return null;
  return String(raw);
}

/** Format a numeric amount for display (no currency prefix). */
export function formatReferencePriceAmount(n) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return null;
  const num = Number(n);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

/** Exchange estimate label, e.g. "Est. BDT 400". */
export function formatExchangePriceLabel(amount) {
  const formatted = formatReferencePriceAmount(amount);
  if (formatted == null) return null;
  return `Est. BDT ${formatted}`;
}

/** Numeric range used for related exchange listings (half to double of reference price). */
export function getRelatedPriceRange(referencePrice) {
  const n = Number(referencePrice);
  if (!Number.isFinite(n) || n < 0) return null;
  return { min: n / 2, max: n * 2 };
}

/** Label for related exchange listings subtitle, e.g. "Est. BDT 150 – Est. BDT 600". */
export function relatedExchangePriceRangeLabel(referencePrice) {
  const range = getRelatedPriceRange(referencePrice);
  if (!range) return null;
  const minLabel = formatExchangePriceLabel(range.min);
  const maxLabel = formatExchangePriceLabel(range.max);
  if (!minLabel || !maxLabel) return null;
  return `${minLabel} – ${maxLabel}`;
}

/**
 * Numeric reference price for exchange listings, or null.
 * Give listings always return null.
 */
export function getReferencePrice(product) {
  if (!product || isGive(product.listingType)) return null;

  const raw =
    product._api?.exchange?.referencePrice ?? product.exchange?.referencePrice;
  if (raw != null && raw !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }

  const label =
    product.exchange?.estimateLabel?.trim() ??
    product._api?.exchange?.estimateLabel?.trim();
  if (!label) return null;

  const match =
    label.match(/BDT\s*([\d,.]+)/i) ?? label.match(/\$\s*([\d,.]+)/);
  if (!match) return null;
  const n = Number(String(match[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Est. reference price for exchange listings (e.g. "Est. BDT 220"), or null. */
export function exchangePriceLabel(product) {
  if (!product || isGive(product.listingType)) return null;

  const n = getReferencePrice(product);
  if (n != null) return formatExchangePriceLabel(n);

  const fromAdapter = product.exchange?.estimateLabel?.trim();
  if (fromAdapter) {
    return fromAdapter.replace(/Est\.\s*\$\s*/i, "Est. BDT ");
  }

  return null;
}
