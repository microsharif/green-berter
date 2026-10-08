import { fetchCategoryChildren } from "../api/categories.js";
import { fetchCategoryById } from "../api/categories.js";

function toBrowseCategory(node) {
  if (!node?.id) return null;
  return {
    id: String(node.id),
    name: String(node.name),
    level: Number(node.level),
  };
}

const LISTING_TYPES = ["give", "exchange"];

/**
 * Resolves a featured-category config to a browse filter node.
 * Supports L1 (`categoryName`) or L2 (`parentCategoryName` + `categoryName`).
 *
 * @param {{ listingType: "give" | "exchange", categoryName: string, parentCategoryName?: string }} config
 */
export async function resolveBrowseCategory(config) {
  const listingType = config.listingType;
  const targetName = String(config.categoryName ?? "").trim();
  if (!listingType || !targetName) return null;

  const l1Rows = await fetchCategoryChildren({ listingType });

  if (config.parentCategoryName) {
    const parentName = String(config.parentCategoryName).trim();
    const parent = l1Rows.find((row) => row.name === parentName);
    if (!parent?.id) return null;

    const l2Rows = await fetchCategoryChildren({
      listingType,
      parentId: parent.id,
    });
    const match = l2Rows.find((row) => row.name === targetName);
    return toBrowseCategory(match);
  }

  const match = l1Rows.find((row) => row.name === targetName);
  return toBrowseCategory(match);
}

/**
 * Resolves the same category name in both give and exchange trees so browse
 * can show all matching listings when the category exists in both.
 *
 * @param {{ categoryName: string, parentCategoryName?: string }} config
 */
export async function resolveBrowseCategoryAcrossTypes(config) {
  const matches = [];

  for (const listingType of LISTING_TYPES) {
    const match = await resolveBrowseCategory({ ...config, listingType });
    if (match) matches.push(match);
  }

  if (!matches.length) return null;

  const categoryIds = matches.map((match) => match.id);
  const primary = matches[0];

  return {
    id: primary.id,
    name: primary.name,
    level: primary.level,
    categoryIds,
  };
}

/** Rehydrate browse selection from a stored category id (deep links). */
export async function resolveBrowseCategoryById(categoryId) {
  const id = String(categoryId ?? "").trim();
  if (!id) return { category: null, listingType: null };

  const { category } = await fetchCategoryById(id);
  if (!category) return { category: null, listingType: null };

  return {
    category: toBrowseCategory(category),
    listingType: category.listingType === "give" ? "give" : "exchange",
  };
}
