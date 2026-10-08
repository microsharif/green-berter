/**
 * Display metadata for the membership plans (cards, checkout, receipt).
 *
 * Pricing + listing caps mirror the server catalog in
 * `server/src/config/membership.js` (single source of truth for enforcement).
 * The benefit bullet lists below are presentation-only copy.
 */
export const MEMBERSHIP_PLAN_DISPLAY = {
  free: {
    key: "free",
    label: "Free Member",
    tagline: "Start swapping at no cost",
    priceBdt: 0,
    priceLabel: "Free",
    period: "",
    listingLimit: 5,
    accent: "zinc",
    icon: "eco",
    benefits: [
      "Post up to 5 active listings",
      "Browse and claim community items",
      "Participate in exchanges",
    ],
  },
  earth: {
    key: "earth",
    label: "Earth Member",
    tagline: "For active everyday swappers",
    priceBdt: 500,
    priceLabel: "BDT 500",
    period: "/year",
    listingLimit: 200,
    accent: "lime",
    icon: "public",
    benefits: [
      "Small gift vouchers",
      "Free participation in events",
      "Free posting allowance up to 200 posts",
      "Recognition as a foundational supporter",
    ],
  },
  sky: {
    key: "sky",
    label: "Sky Member",
    tagline: "For green changemakers",
    priceBdt: 1000,
    priceLabel: "BDT 1,000",
    period: "/year",
    listingLimit: 500,
    accent: "sky",
    icon: "cloud",
    benefits: [
      "Receive a Green Gift (eco-friendly item)",
      "Free event attendance",
      "Entry into exclusive member draws",
      "Featured as Green Star of Bangladesh on website and social media",
      "Priority posting and visibility on platform",
      "500 posts in one year",
    ],
  },
  sun: {
    key: "sun",
    label: "Sun Member",
    tagline: "Our highest impact tier",
    priceBdt: 2000,
    priceLabel: "BDT 2,000",
    period: "/year",
    listingLimit: null,
    accent: "amber",
    icon: "wb_sunny",
    benefits: [
      "Premium Impact Gift (larger eco-friendly or branded item)",
      "VIP access at all events (reserved seating, networking opportunities)",
      "Exclusive invitation to advisory/committee sessions",
      "Recognition as Sustainability Leader on website, events, and media",
      "Unlimited posting privileges with highlighted visibility",
      "Annual Impact Report showing how your membership supported beneficiaries",
    ],
  },
};

export const MEMBERSHIP_PLAN_ORDER = ["free", "earth", "sky", "sun"];

export const PAID_PLAN_KEYS = ["earth", "sky", "sun"];

export function getPlanDisplay(plan) {
  return MEMBERSHIP_PLAN_DISPLAY[plan] ?? MEMBERSHIP_PLAN_DISPLAY.free;
}

export function formatListingLimit(limit) {
  return limit == null ? "Unlimited" : String(limit);
}

/**
 * Bank account details shown on the checkout page. Direct bank transfer is the
 * only supported payment method for now.
 */
export const BANK_TRANSFER_DETAILS = {
  bankName: "Dutch-Bangla Bank PLC",
  accountName: "Green Barter Int. Ltd.",
  accountNumber: "224.151.40444",
  branch: "Gulshan Branch, Dhaka",
  routingNumber: "090260534",
};
