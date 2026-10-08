/**
 * Home page featured category cards → browse filter targets.
 * Names match seeded L1/L2 nodes in `server/src/seed/categoryTree.data.json`.
 */
export const FEATURED_CATEGORIES = [
  {
    id: "clothing-accessories",
    emoji: "👗",
    name: "Clothing & Accessories",
    categoryName: "Clothing & Accessories",
  },
  {
    id: "tools-equipment",
    emoji: "🔧",
    name: "Tools & Equipment",
    parentCategoryName: "Collectibles",
    categoryName: "Tools & Hardware",
  },
  {
    id: "services-skills",
    emoji: "💼",
    name: "Services & Skills",
    categoryName: "Skills/Services",
  },
  {
    id: "home-garden",
    emoji: "🏡",
    name: "Home & Garden",
    categoryName: "Other Home, Garden & Family Items",
  },
  {
    id: "electronics-gadgets",
    emoji: "📱",
    name: "Electronics & Gadgets",
    categoryName: "Consumer Electronics",
  },
];

export function getFeaturedCategoryById(id) {
  const key = String(id ?? "").trim();
  if (!key) return null;
  return FEATURED_CATEGORIES.find((c) => c.id === key) ?? null;
}
