import ListingCategory from "../models/ListingCategory.js";

/**
 * A listing may attach to any active category node that has no children.
 * Most branches stop at level 2; Zakat ranges (level 2) have asset children
 * at level 3.
 */
export async function categoryHasActiveChildren(categoryId) {
  if (!categoryId) return false;
  const count = await ListingCategory.countDocuments({
    parentId: categoryId,
    isActive: true,
  });
  return count > 0;
}

export async function isListingCategoryLeaf(category) {
  if (!category?.isActive) return false;
  return !(await categoryHasActiveChildren(category._id));
}

/** Leaf under the level-1 "Others" bucket (slug ends with /others/others). */
export function isOthersLeafCategory(category) {
  return Boolean(category?.slug?.endsWith("/others/others"));
}

export async function categoriesWithLeafFlags(categories) {
  if (!categories.length) return [];

  const ids = categories.map((c) => c._id);
  const childCounts = await ListingCategory.aggregate([
    { $match: { parentId: { $in: ids }, isActive: true } },
    { $group: { _id: "$parentId", count: { $sum: 1 } } },
  ]);
  const parentsWithChildren = new Set(
    childCounts.map((row) => String(row._id))
  );

  return categories.map((c) => {
    const hasChildren = parentsWithChildren.has(String(c._id));
    return {
      ...c.toPublicJSON(),
      hasChildren,
      isLeaf: !hasChildren,
    };
  });
}
