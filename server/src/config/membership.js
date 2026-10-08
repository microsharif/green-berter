/**
 * Membership plan catalog.
 *
 * Single source of truth for plan keys, prices, and the per-plan listing cap
 * enforced on `POST /listings`. The free plan is the default for every newly
 * registered user; paid plans are requested via direct bank transfer and
 * activated later (no payment gateway / admin UI yet).
 *
 * `listingLimit: null` means unlimited (Sun plan).
 */
export const MEMBERSHIP_PLANS = Object.freeze({
  free: {
    key: "free",
    label: "Free Member",
    priceBdt: 0,
    listingLimit: 5,
    billingPeriod: "none",
  },
  earth: {
    key: "earth",
    label: "Earth Member",
    priceBdt: 500,
    listingLimit: 200,
    billingPeriod: "yearly",
  },
  sky: {
    key: "sky",
    label: "Sky Member",
    priceBdt: 1000,
    listingLimit: 500,
    billingPeriod: "yearly",
  },
  sun: {
    key: "sun",
    label: "Sun Member",
    priceBdt: 2000,
    listingLimit: null,
    billingPeriod: "yearly",
  },
});

export const MEMBERSHIP_PLAN_KEYS = Object.freeze(
  Object.keys(MEMBERSHIP_PLANS)
);

export const DEFAULT_MEMBERSHIP_PLAN = "free";

export const MEMBERSHIP_STATUSES = Object.freeze([
  "active",
  "pending",
  "expired",
]);

/** Whether a plan key exists in the catalog. */
export function isValidPlan(plan) {
  return Object.prototype.hasOwnProperty.call(MEMBERSHIP_PLANS, plan);
}

/** Paid plans are everything except the free default. */
export function isPaidPlan(plan) {
  return isValidPlan(plan) && MEMBERSHIP_PLANS[plan].priceBdt > 0;
}

/** Listing cap for a plan (null = unlimited). Unknown plans fall back to free. */
export function getPlanListingLimit(plan) {
  const entry = isValidPlan(plan) ? MEMBERSHIP_PLANS[plan] : MEMBERSHIP_PLANS.free;
  return entry.listingLimit;
}

/** Price in BDT for a plan; 0 for free / unknown. */
export function getPlanPriceBdt(plan) {
  return isValidPlan(plan) ? MEMBERSHIP_PLANS[plan].priceBdt : 0;
}
