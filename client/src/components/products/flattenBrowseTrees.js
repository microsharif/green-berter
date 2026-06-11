import { fetchCategoryChildren } from "../../api/categories.js";
import { fetchLocationChildren } from "../../api/locations.js";
import { isCategoryLeaf } from "../../constants/categoryLevels.js";

const LOCATION_LEVEL_LABELS = ["Division", "City", "Area"];
const MAX_LOCATION_LEVEL = 2;

/**
 * @typedef {Object} FlatBrowseOption
 * @property {string} id
 * @property {string} name
 * @property {number} level
 * @property {string} breadcrumb
 * @property {string} levelLabel
 * @property {string} searchHaystack
 */

let locationCache = null;
let locationLoadPromise = null;
const categoryCacheByType = new Map();

/**
 * @returns {Promise<FlatBrowseOption[]>}
 */
export async function flattenLocationTree() {
  if (locationCache) return locationCache;
  if (locationLoadPromise) return locationLoadPromise;

  locationLoadPromise = loadLocationTree().then((data) => {
    locationCache = data;
    return data;
  });
  return locationLoadPromise;
}

async function loadLocationTree() {
  /** @type {FlatBrowseOption[]} */
  const flat = [];

  async function walk(parentId, ancestorNames) {
    const nodes = await fetchLocationChildren(
      parentId ? { parentId } : {}
    );
    for (const node of nodes) {
      const path = [...ancestorNames, node.name];
      const breadcrumb = path.join(" › ");
      flat.push({
        id: String(node.id),
        name: node.name,
        level: node.level,
        breadcrumb,
        levelLabel: LOCATION_LEVEL_LABELS[node.level] ?? "Location",
        searchHaystack: path.join(" ").toLowerCase(),
      });
      if (node.level < MAX_LOCATION_LEVEL) {
        await walk(node.id, path);
      }
    }
  }

  await walk(null, []);
  return flat;
}

/**
 * @param {"give" | "exchange"} listingType
 * @returns {Promise<FlatBrowseOption[]>}
 */
export async function flattenCategoryTree(listingType) {
  if (categoryCacheByType.has(listingType)) {
    return categoryCacheByType.get(listingType);
  }

  const data = await loadCategoryTree(listingType);
  categoryCacheByType.set(listingType, data);
  return data;
}

async function loadCategoryTree(listingType) {
  /** @type {FlatBrowseOption[]} */
  const flat = [];

  async function walk(parentId, ancestorNames) {
    const nodes = await fetchCategoryChildren({
      listingType,
      ...(parentId ? { parentId } : {}),
    });
    for (const node of nodes) {
      const path = [...ancestorNames, node.name];
      const breadcrumb = path.join(" › ");
      const isLeaf = node.isLeaf ?? isCategoryLeaf(node);
      const depth = path.length;
      flat.push({
        id: String(node.id),
        name: node.name,
        level: node.level,
        breadcrumb,
        levelLabel: isLeaf
          ? depth > 1
            ? "Child category"
            : "Category"
          : "Parent category",
        searchHaystack: path.join(" ").toLowerCase(),
      });
      if (!isLeaf) {
        await walk(node.id, path);
      }
    }
  }

  await walk(null, []);
  return flat;
}

/** @param {FlatBrowseOption[]} items */
export function filterFlatBrowseOptions(items, query, limit = 50) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return items
    .filter((item) =>
      tokens.every((token) => item.searchHaystack.includes(token))
    )
    .slice(0, limit);
}
