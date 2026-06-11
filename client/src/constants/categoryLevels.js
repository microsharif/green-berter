/** Deepest level in the tree (Zakat assets only). Most categories leaf at level 2. */
export const MAX_CATEGORY_LEVEL = 3;

export function isCategoryLeaf(category) {
  if (!category) return false;
  if (typeof category.isLeaf === "boolean") return category.isLeaf;
  if (typeof category.hasChildren === "boolean") return !category.hasChildren;
  if (category.level >= MAX_CATEGORY_LEVEL) return true;
  if (category.level === 2) return category.hasChildren !== true;
  return false;
}
