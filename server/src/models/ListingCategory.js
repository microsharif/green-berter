import mongoose from "mongoose";

/**
 * Listing types that can root a category tree. Mirrors the
 * `listings.listingType` enum and is inherited by every descendant of a
 * root.
 */
export const LISTING_TYPES = Object.freeze(["give", "exchange"]);

/**
 * Category depth:
 *   level 0 = root (give / exchange)
 *   level 1 = category (e.g. Art, Zakat)
 *   level 2 = subcategory leaf OR Zakat range (intermediate)
 *   level 3 = Zakat asset leaf only
 *
 * Most branches are 2 levels deep (L1 → L2 leaf). Zakat alone uses L3.
 * Listings attach to nodes with no active children — see `isListingCategoryLeaf`.
 */
export const MAX_CATEGORY_LEVEL = 3;

// Slugs are namespaced top-down: "give", "give/home-living",
// "give/home-living/furniture". Each segment is kebab-case.
const SLUG_SEGMENT = /[a-z0-9]+(?:-[a-z0-9]+)*/;
const SLUG_REGEX = new RegExp(
  `^${SLUG_SEGMENT.source}(?:/${SLUG_SEGMENT.source}){0,${MAX_CATEGORY_LEVEL}}$`
);

const listingCategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [SLUG_REGEX, "Invalid slug format"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
      maxlength: 120,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ListingCategory",
      default: null,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_CATEGORY_LEVEL,
      index: true,
    },
    /**
     * Path from the root down to (but excluding) this node. `ancestors[0]`
     * is always the root, `ancestors[level-1]` is the immediate parent, so
     * by invariant `ancestors.length === level`.
     */
    ancestors: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ListingCategory" }],
      default: [],
    },
    listingType: {
      type: String,
      enum: LISTING_TYPES,
      required: true,
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Compound index for browsing a single tree top-down (filter by listingType
// + parent, sort by sortOrder). Avoids a full collection scan when rendering
// the category picker on /upload.
listingCategorySchema.index({ listingType: 1, parentId: 1, sortOrder: 1 });
listingCategorySchema.index({ ancestors: 1 });

/**
 * Enforces the structural invariants implied by the schema diagram:
 *   - level 0 nodes have no parent and no ancestors.
 *   - level > 0 nodes carry a parent + a fully-formed ancestor chain whose
 *     length equals `level`.
 *
 * Bypassing this check would let us insert documents that look fine in
 * isolation but produce orphan leaves in the tree.
 */
listingCategorySchema.pre("validate", function enforceTreeInvariants() {
  const ancestorsLen = Array.isArray(this.ancestors) ? this.ancestors.length : 0;
  if (ancestorsLen !== this.level) {
    throw new Error(
      `ancestors length (${ancestorsLen}) must equal level (${this.level})`
    );
  }
  if (this.level === 0 && this.parentId) {
    throw new Error("root categories must have parentId=null");
  }
  if (this.level > 0 && !this.parentId) {
    throw new Error("non-root categories require a parentId");
  }
});

/**
 * Returns active categories that have no children (valid listing targets).
 */
listingCategorySchema.statics.findLeaves = async function findLeaves(
  filter = {}
) {
  const candidates = await this.find({ ...filter, isActive: true }).sort({
    listingType: 1,
    sortOrder: 1,
  });
  if (!candidates.length) return [];

  const ids = candidates.map((c) => c._id);
  const childCounts = await this.aggregate([
    { $match: { parentId: { $in: ids }, isActive: true } },
    { $group: { _id: "$parentId", count: { $sum: 1 } } },
  ]);
  const parentsWithChildren = new Set(
    childCounts.map((row) => String(row._id))
  );
  return candidates.filter((c) => !parentsWithChildren.has(String(c._id)));
};

/**
 * Safe shape returned to API consumers. Strips Mongoose internals and
 * stringifies ObjectIds so the client can compare them directly.
 */
listingCategorySchema.method("toPublicJSON", function toPublicJSON() {
  return {
    id: String(this._id),
    slug: this.slug,
    name: this.name,
    parentId: this.parentId ? String(this.parentId) : null,
    level: this.level,
    ancestors: (this.ancestors ?? []).map((id) => String(id)),
    listingType: this.listingType,
    sortOrder: this.sortOrder,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

const ListingCategory = mongoose.model(
  "ListingCategory",
  listingCategorySchema,
  "listing_categories"
);
export default ListingCategory;
