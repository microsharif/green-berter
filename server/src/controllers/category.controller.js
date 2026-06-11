import mongoose from "mongoose";
import ListingCategory, {
  LISTING_TYPES,
} from "../models/ListingCategory.js";
import { categoriesWithLeafFlags } from "../utils/categoryTree.js";

/**
 * GET /api/v1/categories
 *
 * Drives the cascading category picker on the upload page. Always returns
 * **direct children** of a parent node — no recursion / tree flattening —
 * because the UI fetches one level at a time.
 *
 * Query params:
 *   listingType  required  "give" | "exchange"
 *   parentId     optional  ObjectId of a parent category. When omitted the
 *                          response is the listingType root's L1 children
 *                          (the toggle already picked the listingType, so
 *                          there's no need to expose the root in the UI).
 *
 * Response shape: `{ ok, categories: [...] }`, sorted by sortOrder.
 */
export async function listCategories(req, res, next) {
  try {
    const listingType =
      typeof req.query.listingType === "string"
        ? req.query.listingType.trim()
        : "";
    if (!LISTING_TYPES.includes(listingType)) {
      return res.status(400).json({
        ok: false,
        code: "INVALID_LISTING_TYPE",
        message: `listingType must be one of: ${LISTING_TYPES.join(", ")}`,
      });
    }

    const filter = { listingType, isActive: true };

    const parentIdRaw =
      typeof req.query.parentId === "string" ? req.query.parentId.trim() : "";
    if (parentIdRaw) {
      if (!mongoose.isValidObjectId(parentIdRaw)) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_PARENT_ID",
          message: "parentId is not a valid ObjectId.",
        });
      }
      const parent = await ListingCategory.findOne({
        _id: parentIdRaw,
        listingType,
        isActive: true,
      })
        .select("_id")
        .lean();
      if (!parent) {
        return res.status(404).json({
          ok: false,
          code: "PARENT_NOT_FOUND",
          message: "Parent category not found in this tree.",
        });
      }
      filter.parentId = parent._id;
    } else {
      // No parent → first dropdown of the cascade. Skip the root (level 0)
      // since the listingType toggle already picked it.
      filter.level = 1;
    }

    const categories = await ListingCategory.find(filter)
      .sort({ sortOrder: 1, name: 1 });

    return res.json({
      ok: true,
      categories: await categoriesWithLeafFlags(categories),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/categories/:id
 *
 * Returns one node plus breadcrumb segments (for edit-form rehydration).
 */
export async function getCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found.",
      });
    }

    const node = await ListingCategory.findOne({ _id: id, isActive: true });
    if (!node) {
      return res.status(404).json({
        ok: false,
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found.",
      });
    }

    const ancestorIds = node.ancestors ?? [];
    const ancestors = ancestorIds.length
      ? await ListingCategory.find({
          _id: { $in: ancestorIds },
          isActive: true,
        })
      : [];
    const byId = new Map(ancestors.map((a) => [String(a._id), a]));
    const chain = ancestorIds
      .map((aid) => byId.get(String(aid)))
      .filter(Boolean);
    chain.push(node);
    const flagged = await categoriesWithLeafFlags(chain);

    const breadcrumb = flagged
      .filter((cat) => cat.level >= 1)
      .map(({ id: catId, name, level, isLeaf, hasChildren }) => ({
        id: catId,
        name,
        level,
        isLeaf,
        hasChildren,
      }));

    const [category] = flagged.filter((cat) => cat.id === String(node._id));

    return res.json({
      ok: true,
      category: category ?? node.toPublicJSON(),
      breadcrumb,
    });
  } catch (err) {
    return next(err);
  }
}
