import { resolveMediaUrl } from "../utils/mediaUrl.js";
import { formatExchangePriceLabel } from "../components/products/productUtils.js";
import { DEMO_PROFILE_AVATAR_URL } from "./catalog.js";

/**
 * Human-friendly "5 minutes ago" / "3 days ago" string from an ISO date.
 * Light, dependency-free, "good enough" for the listing cards — we can
 * swap for a real i18n-aware formatter later without changing call sites.
 */
function timeAgo(iso) {
  if (!iso) return "Recently";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recently";
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const ranges = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
  ];
  for (let i = 0; i < ranges.length; i++) {
    const [limit, unit] = ranges[i];
    if (secs < limit) {
      const prev = i === 0 ? 1 : ranges[i - 1][0];
      const n = Math.max(1, Math.floor(secs / prev));
      return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
    }
  }
  const years = Math.floor(secs / 31557600);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function clip(s, max) {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Adapt an API listing (server's `Listing.toPublicJSON()`) into the legacy
 * catalog-product shape the existing UI components already consume.
 *
 * Doing the impedance match in one place keeps the rest of the app
 * unchanged: cards, detail view, related strip, etc. all keep using
 * `product.shortDescription`, `product.seller`, `product.specs`, etc.
 * even though the API speaks a normalized shape.
 */
export function apiListingToCatalogProduct(listing) {
  if (!listing) return null;
  const isExchange = listing.listingType === "exchange";

  const owner = listing.owner ?? null;
  const sellerName = owner?.fullName?.trim() || "Community member";
  const sellerAvatar = owner?.profileImageUrl
    ? resolveMediaUrl(owner.profileImageUrl)
    : DEMO_PROFILE_AVATAR_URL;

  const apiSpecs = listing.specs && typeof listing.specs === "object" && !Array.isArray(listing.specs)
    ? Object.entries(listing.specs).map(([label, value]) => ({
        label,
        value: String(value),
      }))
    : [];
  const specs = [
    { label: "Category", value: listing.categoryName ?? "—" },
    ...(listing.categoryPath
      ? [{ label: "Section", value: listing.categoryPath }]
      : []),
    ...apiSpecs,
    { label: "Source", value: "Member listing" },
  ];

  const baseTag = {
    label: isExchange ? "Exchange Available" : "Free",
    variant: isExchange ? "exchange" : "give",
  };
  const tags = [
    baseTag,
    ...(listing.categoryName
      ? [{ label: clip(listing.categoryName, 24), variant: "neutral" }]
      : []),
    ...((listing.tags ?? []).map((t) => ({
      label: clip(String(t), 24),
      variant: "neutral",
    }))),
  ];

  const exchange = isExchange
    ? {
        estimateLabel:
          listing.exchange?.referencePrice != null
            ? formatExchangePriceLabel(listing.exchange.referencePrice)
            : "Value TBD",
        estimateHint: "Equivalent credits",
        desiredItems:
          listing.exchange?.desiredItems?.length > 0
            ? listing.exchange.desiredItems
            : ["Open to fair trades"],
      }
    : null;

  return {
    id: String(listing.id),
    title: listing.title ?? "Untitled",
    location: (() => {
      if (listing.location) return listing.location;
      const parts = [listing.areaName, listing.cityName, listing.divisionName].filter(
        Boolean
      );
      if (parts.length) return parts.join(", ");
      return listing.locationPath ?? "Location TBD";
    })(),
    locationPath: listing.locationPath ?? null,
    divisionName: listing.divisionName ?? null,
    cityName: listing.cityName ?? null,
    areaName: listing.areaName ?? null,
    areaId: listing.areaId ? String(listing.areaId) : null,
    pickupLatitude: listing.pickupLatitude ?? null,
    pickupLongitude: listing.pickupLongitude ?? null,
    listingType: isExchange ? "exchange" : "give",
    imageUrl: resolveMediaUrl(listing.imageUrl ?? ""),
    shortDescription: clip(listing.story, 180) || clip(listing.title, 120),
    condition: "See description",
    postedAgo: timeAgo(listing.createdAt),
    narrative: listing.story || "Listed on The Regenerative Exchange.",
    specs,
    tags,
    seller: {
      name: sellerName,
      avatar: sellerAvatar,
      subtitle: "Community member",
      verified: true,
      ownerId: owner?.id
        ? String(owner.id)
        : listing.ownerUserId
          ? String(listing.ownerUserId)
          : null,
    },
    ownerUserId: listing.ownerUserId ? String(listing.ownerUserId) : null,
    categoryId: listing.categoryId ? String(listing.categoryId) : null,
    categoryName: listing.categoryName ?? null,
    categoryPath: listing.categoryPath ?? null,
    status: listing.status ?? "available",
    exchange,
    gallery: {
      heroAlt: listing.title ?? "",
      secondary: (listing.gallery ?? [])
        .map((u) => resolveMediaUrl(u))
        .filter(Boolean),
    },
    relatedIds: Array.isArray(listing.relatedIds)
      ? listing.relatedIds.map(String)
      : [],
    // Raw API copy in case callers need fields we didn't surface (edit flow).
    _api: listing,
  };
}
