import mongoose from "mongoose";
import Listing, { LISTING_STATUSES } from "../models/Listing.js";
import ListingCategory, {
  LISTING_TYPES,
} from "../models/ListingCategory.js";
import ListingLocation, {
  MAX_LOCATION_LEVEL,
} from "../models/ListingLocation.js";
import { UPLOAD_KINDS, isOwnedUploadUrl } from "../config/upload.js";
import { deleteStoredImage } from "../services/imageStorage.service.js";
import { buildPartyProfile } from "../utils/userPrivacy.js";
import {
  isListingCategoryLeaf,
  isOthersLeafCategory,
} from "../utils/categoryTree.js";
import User from "../models/User.js";
import {
  getPlanListingLimit,
  DEFAULT_MEMBERSHIP_PLAN,
} from "../config/membership.js";

const MAX_TITLE_LEN = 200;
const MAX_LOCATION_LEN = 200;
const MAX_STORY_LEN = 5000;
const MAX_CATEGORY_NOTE_LEN = 500;
const MAX_TAGS = 20;
const MAX_TAG_LEN = 40;
const MAX_GALLERY_IMAGES = 12;
const MAX_DESIRED_ITEMS = 10;
const MAX_DESIRED_ITEM_LEN = 120;
const MIN_PICKUP_LAT = 20;
const MAX_PICKUP_LAT = 27;
const MIN_PICKUP_LNG = 88;
const MAX_PICKUP_LNG = 93;

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCoordinate(value, field, errors, { min, max }) {
  if (value == null || value === "") {
    errors[field] = `${field} is required`;
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    errors[field] = `${field} is out of range`;
    return null;
  }
  return n;
}

function buildLocationDisplay({ areaName, cityName, divisionName, pickupNotes }) {
  const base = [areaName, cityName, divisionName].filter(Boolean).join(", ");
  const notes = typeof pickupNotes === "string" ? pickupNotes.trim() : "";
  if (!notes) return base.slice(0, MAX_LOCATION_LEN);
  const combined = `${base} — ${notes}`;
  return combined.slice(0, MAX_LOCATION_LEN);
}

function buildLocationPathString({ divisionName, cityName, areaName }) {
  return [divisionName, cityName, areaName].filter(Boolean).join(" > ");
}

/**
 * Resolves a leaf area and its division/city ancestors for denormalized listing fields.
 */
async function resolveAreaLocation(areaId) {
  const area = await ListingLocation.findById(areaId);
  if (!area || !area.isActive) return { error: "INVALID_AREA", area: null };
  if (area.level !== MAX_LOCATION_LEVEL) {
    return { error: "AREA_NOT_LEAF", area: null };
  }

  const ancestorIds = area.ancestors ?? [];
  const ancestors = ancestorIds.length
    ? await ListingLocation.find({ _id: { $in: ancestorIds } })
        .select("_id name level")
        .lean()
    : [];
  const byId = new Map(ancestors.map((a) => [String(a._id), a]));

  const division = ancestorIds[0] ? byId.get(String(ancestorIds[0])) : null;
  const city = ancestorIds[1] ? byId.get(String(ancestorIds[1])) : null;

  return {
    error: null,
    area,
    divisionName: division?.name ?? "",
    cityName: city?.name ?? "",
    areaName: area.name,
  };
}

function asStringArray(value, { max, maxLen }) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || trimmed.length > maxLen) continue;
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Validates the body of POST /listings into a clean payload + per-field
 * errors map. Mirrors DFD §2 step 3 ("Block submit on missing required
 * fields or image").
 *
 * NB: category validation that requires a DB lookup (existence / leafness /
 * listingType match) is intentionally separate — keeping this function pure
 * makes it easy to unit-test later.
 */
function validateCreatePayload(body) {
  const errors = {};

  const title = asString(body.title);
  if (!title) errors.title = "Title is required";
  else if (title.length > MAX_TITLE_LEN) errors.title = "Title is too long";

  const listingType = asString(body.listingType);
  if (!listingType) errors.listingType = "Listing type is required";
  else if (!LISTING_TYPES.includes(listingType)) {
    errors.listingType = `Listing type must be one of: ${LISTING_TYPES.join(", ")}`;
  }

  const imageUrl = asString(body.imageUrl);
  if (!imageUrl) errors.imageUrl = "Product image is required";
  else if (!isOwnedUploadUrl(imageUrl, UPLOAD_KINDS.PRODUCT)) {
    errors.imageUrl = "Invalid image reference";
  }

  const rawGallery = Array.isArray(body.gallery) ? body.gallery : [];
  const gallery = [];
  for (const entry of rawGallery.slice(0, MAX_GALLERY_IMAGES)) {
    const url = asString(entry);
    if (!url) continue;
    if (!isOwnedUploadUrl(url, UPLOAD_KINDS.PRODUCT)) {
      errors.gallery = "Invalid gallery image reference";
      break;
    }
    gallery.push(url);
  }

  const areaId = asString(body.areaId);
  if (!areaId) errors.areaId = "Area is required";
  else if (!mongoose.isValidObjectId(areaId)) {
    errors.areaId = "Invalid area id";
  }

  const pickupLatitude = parseCoordinate(
    body.pickupLatitude,
    "pickupLatitude",
    errors,
    { min: MIN_PICKUP_LAT, max: MAX_PICKUP_LAT }
  );
  const pickupLongitude = parseCoordinate(
    body.pickupLongitude,
    "pickupLongitude",
    errors,
    { min: MIN_PICKUP_LNG, max: MAX_PICKUP_LNG }
  );

  const pickupNotes = asString(body.pickupNotes);

  const story = asString(body.story);
  if (!story) errors.story = "Story is required";
  else if (story.length > MAX_STORY_LEN) errors.story = "Story is too long";

  const categoryId = asString(body.categoryId);
  if (!categoryId) errors.categoryId = "Category is required";
  else if (!mongoose.isValidObjectId(categoryId)) {
    errors.categoryId = "Invalid category id";
  }

  const tags = asStringArray(body.tags, {
    max: MAX_TAGS,
    maxLen: MAX_TAG_LEN,
  });

  const specs =
    body.specs && typeof body.specs === "object" && !Array.isArray(body.specs)
      ? body.specs
      : {};

  const categoryNote = asString(body.categoryNote);
  if (categoryNote.length > MAX_CATEGORY_NOTE_LEN) {
    errors.categoryNote = "Category note is too long";
  }

  const interestedCategoryNote = asString(body.interestedCategoryNote);
  if (interestedCategoryNote.length > MAX_CATEGORY_NOTE_LEN) {
    errors.interestedCategoryNote = "Interested category note is too long";
  }

  // `exchange` block is read for both listing types; values are ignored
  // (and never persisted) when listingType !== "exchange".
  const exchangeIn = body.exchange ?? {};
  const exchange = {};
  if (listingType === "exchange") {
    if (exchangeIn.referencePrice != null && exchangeIn.referencePrice !== "") {
      const rp = Number(exchangeIn.referencePrice);
      if (Number.isFinite(rp) && rp >= 0) {
        exchange.referencePrice = rp;
      } else {
        errors.referencePrice = "Estimated price must be a positive number";
      }
    }

    const interestedCategoryId = asString(exchangeIn.interestedCategoryId);
    if (!interestedCategoryId) {
      errors.interestedCategoryId = "Interested item category is required";
    } else if (!mongoose.isValidObjectId(interestedCategoryId)) {
      errors.interestedCategoryId = "Invalid interested category id";
    } else {
      exchange.interestedCategoryId = interestedCategoryId;
    }
  }

  return {
    errors,
    cleaned: {
      title,
      listingType,
      imageUrl,
      gallery,
      categoryId,
      areaId,
      pickupLatitude,
      pickupLongitude,
      pickupNotes,
      story,
      tags,
      specs,
      categoryNote,
      interestedCategoryNote,
      exchange,
    },
  };
}

function buildSpecsWithCategoryNotes({
  specs,
  category,
  categoryNote,
  interestedCategory,
  interestedCategoryNote,
}) {
  const next = { ...(specs && typeof specs === "object" ? specs : {}) };
  if (category && isOthersLeafCategory(category)) {
    next.categoryNote = categoryNote;
  } else {
    delete next.categoryNote;
  }
  if (interestedCategory && isOthersLeafCategory(interestedCategory)) {
    next.interestedCategoryNote = interestedCategoryNote;
  } else {
    delete next.interestedCategoryNote;
  }
  return next;
}

/**
 * Hydrates the owner sub-document on a listing response so the product
 * detail page can render the seller card without a second round-trip. We
 * deliberately project only the public fields (name + avatar) — passwordHash
 * is `select: false` already, but explicit is better here.
 */
async function attachOwner(listingJson, viewerUserId = null) {
  if (!listingJson?.ownerUserId) return listingJson;
  const owner = await mongoose
    .model("User")
    .findById(listingJson.ownerUserId)
    .select("_id fullName email phone profileImageUrl privacy")
    .lean();
  if (owner) {
    listingJson.owner = buildPartyProfile(owner, viewerUserId);
  }
  return listingJson;
}

/**
 * Returns the category's breadcrumb in the form expected by the schema's
 * `categoryPath` field, e.g. "Give > Home & Living > Furniture > Chairs".
 * One round-trip to fetch every ancestor name in a single query.
 */
/**
 * Validates an exchange-tree leaf for "interested item" and returns the
 * breadcrumb stored in `exchange.desiredItems`.
 */
async function resolveInterestedCategory(categoryId) {
  const category = await ListingCategory.findById(categoryId);
  if (!category || !category.isActive) {
    return { error: "INVALID_INTERESTED_CATEGORY", category: null, categoryPath: null };
  }
  if (!(await isListingCategoryLeaf(category))) {
    return { error: "INTERESTED_CATEGORY_NOT_LEAF", category: null, categoryPath: null };
  }
  if (category.listingType !== "exchange") {
    return {
      error: "INTERESTED_CATEGORY_TYPE_MISMATCH",
      category: null,
      categoryPath: null,
    };
  }
  const categoryPath = await buildCategoryPath(category);
  return {
    error: null,
    category,
    categoryPath,
    desiredItems: [categoryPath],
  };
}

async function buildCategoryPath(category) {
  if (!Array.isArray(category.ancestors) || category.ancestors.length === 0) {
    return category.name;
  }
  const ancestors = await ListingCategory.find({
    _id: { $in: category.ancestors },
  })
    .select("_id name")
    .lean();
  const byId = new Map(ancestors.map((a) => [String(a._id), a.name]));
  const names = category.ancestors
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
  return [...names, category.name].join(" > ");
}

/**
 * POST /api/v1/listings
 *
 * DFD §2 step 3 + 4 (server side):
 *   - validate required fields + image
 *   - INSERT listing row (status: available, ownerUserId: req.userId)
 *
 * Requires authentication. The image must already exist under
 * `/upload/<date>/product/<uuid>.webp` — uploaded earlier via
 * `POST /api/v1/upload/product-image`.
 */
export async function createListing(req, res, next) {
  try {
    const { errors, cleaned } = validateCreatePayload(req.body ?? {});
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    // Enforce the per-plan listing cap. The limit counts every listing the
    // user currently owns (deleting a listing frees a slot). `null` = the
    // Sun plan's unlimited posting privilege.
    const owner = await User.findById(req.userId).select("membership").lean();
    const plan = owner?.membership?.plan ?? DEFAULT_MEMBERSHIP_PLAN;
    const listingLimit = getPlanListingLimit(plan);
    if (listingLimit != null) {
      const ownedCount = await Listing.countDocuments({
        ownerUserId: req.userId,
      });
      if (ownedCount >= listingLimit) {
        return res.status(403).json({
          ok: false,
          code: "LISTING_LIMIT_REACHED",
          message: `Your ${plan} plan allows up to ${listingLimit} listings. Upgrade your membership to post more.`,
          details: { plan, limit: listingLimit, current: ownedCount },
        });
      }
    }

    const category = await ListingCategory.findById(cleaned.categoryId);
    if (!category || !category.isActive) {
      return res.status(400).json({
        ok: false,
        code: "INVALID_CATEGORY",
        message: "Category not found.",
        errors: { categoryId: "Category not found" },
      });
    }
    if (!(await isListingCategoryLeaf(category))) {
      return res.status(400).json({
        ok: false,
        code: "CATEGORY_NOT_LEAF",
        message: "Pick the most specific (leaf) category.",
        errors: { categoryId: "Pick a leaf category" },
      });
    }
    if (category.listingType !== cleaned.listingType) {
      return res.status(400).json({
        ok: false,
        code: "CATEGORY_TYPE_MISMATCH",
        message: `That category belongs to the "${category.listingType}" tree.`,
        errors: { categoryId: "Category does not match listing type" },
      });
    }

    const categoryPath = await buildCategoryPath(category);

    if (isOthersLeafCategory(category) && !cleaned.categoryNote) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors: { categoryNote: "Add a note describing your item." },
      });
    }

    const resolved = await resolveAreaLocation(cleaned.areaId);
    if (resolved.error === "INVALID_AREA") {
      return res.status(400).json({
        ok: false,
        code: "INVALID_AREA",
        message: "Area not found.",
        errors: { areaId: "Area not found" },
      });
    }
    if (resolved.error === "AREA_NOT_LEAF") {
      return res.status(400).json({
        ok: false,
        code: "AREA_NOT_LEAF",
        message: "Pick the most specific (area) location.",
        errors: { areaId: "Pick an area" },
      });
    }

    const { divisionName, cityName, areaName, area } = resolved;
    const locationPath = buildLocationPathString({
      divisionName,
      cityName,
      areaName,
    });
    const location = buildLocationDisplay({
      areaName,
      cityName,
      divisionName,
      pickupNotes: cleaned.pickupNotes,
    });

    let exchangePayload = cleaned.exchange;
    let interestedCategory = null;
    if (cleaned.listingType === "exchange") {
      const interested = await resolveInterestedCategory(
        cleaned.exchange.interestedCategoryId
      );
      if (interested.error === "INVALID_INTERESTED_CATEGORY") {
        return res.status(400).json({
          ok: false,
          code: "INVALID_INTERESTED_CATEGORY",
          message: "Interested category not found.",
          errors: { interestedCategoryId: "Category not found" },
        });
      }
      if (interested.error === "INTERESTED_CATEGORY_NOT_LEAF") {
        return res.status(400).json({
          ok: false,
          code: "INTERESTED_CATEGORY_NOT_LEAF",
          message: "Pick the most specific interested category.",
          errors: { interestedCategoryId: "Pick a leaf category" },
        });
      }
      if (interested.error === "INTERESTED_CATEGORY_TYPE_MISMATCH") {
        return res.status(400).json({
          ok: false,
          code: "INTERESTED_CATEGORY_TYPE_MISMATCH",
          message: "Interested category must be from the exchange tree.",
          errors: { interestedCategoryId: "Must be an exchange category" },
        });
      }
      interestedCategory = interested.category;
      if (
        isOthersLeafCategory(interestedCategory) &&
        !cleaned.interestedCategoryNote
      ) {
        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Please fix the highlighted fields.",
          errors: {
            interestedCategoryNote: "Add a note describing the item you want.",
          },
        });
      }
      exchangePayload = {
        referencePrice: cleaned.exchange.referencePrice ?? null,
        desiredItems: interested.desiredItems,
      };
    }

    const listing = new Listing({
      ownerUserId: req.userId,
      title: cleaned.title,
      listingType: cleaned.listingType,
      imageUrl: cleaned.imageUrl,
      gallery: cleaned.gallery,
      categoryId: category._id,
      categoryName: category.name,
      categoryPath,
      areaId: area._id,
      divisionName,
      cityName,
      areaName,
      locationPath,
      location,
      pickupLatitude: cleaned.pickupLatitude,
      pickupLongitude: cleaned.pickupLongitude,
      story: cleaned.story,
      tags: cleaned.tags,
      specs: buildSpecsWithCategoryNotes({
        specs: cleaned.specs,
        category,
        categoryNote: cleaned.categoryNote,
        interestedCategory,
        interestedCategoryNote: cleaned.interestedCategoryNote,
      }),
      exchange: exchangePayload,
      status: "available",
    });
    await listing.save();

    return res.status(201).json({
      ok: true,
      message: "Listing created.",
      listing: await attachOwner(listing.toPublicJSON(), req.userId ?? null),
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      const fieldErrors = {};
      for (const [field, detail] of Object.entries(err.errors)) {
        fieldErrors[field] = detail.message;
      }
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors: fieldErrors,
      });
    }
    return next(err);
  }
}

/**
 * GET /api/v1/listings/:id
 *
 * Public read — used by the product detail page after `Persist & redirect`
 * (DFD §2 step 4). Returns 404 for unknown / malformed ids.
 */
export async function getListing(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }
    return res.json({
      ok: true,
      listing: await attachOwner(listing.toPublicJSON(), req.userId ?? null),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Resolves a category filter to a leaf id or a set of leaf ids in the
 * selected node's subtree (browse may pick a non-leaf category).
 */
async function resolveCategoryFilter(categoryId) {
  const cat = await ListingCategory.findById(categoryId);
  if (!cat || !cat.isActive) return null;
  if (await isListingCategoryLeaf(cat)) {
    return { categoryId: cat._id };
  }

  const subtree = await ListingCategory.find({
    $or: [{ _id: cat._id }, { ancestors: cat._id }],
    isActive: true,
  })
    .select("_id parentId")
    .lean();

  const leafIds = subtree
    .filter(
      (node) =>
        !subtree.some((other) => String(other.parentId) === String(node._id))
    )
    .map((node) => node._id);

  return leafIds.length
    ? { categoryId: { $in: leafIds } }
    : { categoryId: cat._id };
}

/** Merges multiple category roots (e.g. give + exchange L1 with the same name). */
async function resolveCategoryFilterIds(categoryIds) {
  const leafIds = new Set();

  for (const categoryId of categoryIds) {
    const categoryFilter = await resolveCategoryFilter(categoryId);
    if (!categoryFilter?.categoryId) continue;

    if (categoryFilter.categoryId.$in) {
      for (const id of categoryFilter.categoryId.$in) {
        leafIds.add(String(id));
      }
    } else {
      leafIds.add(String(categoryFilter.categoryId));
    }
  }

  if (!leafIds.size) return null;
  const ids = [...leafIds].map((id) => new mongoose.Types.ObjectId(id));
  return ids.length === 1
    ? { categoryId: ids[0] }
    : { categoryId: { $in: ids } };
}

/**
 * GET /api/v1/listings
 *
 * Public browse + profile "my listings" panel. Supported query params:
 *
 *   listingType  — "give" | "exchange"     (filters by tree)
 *   ownerUserId  — ObjectId string         (profile panel)
 *   categoryId   — ObjectId string         (category-filtered browse; non-leaf
 *                  ids match the whole subtree)
 *   categoryIds  — comma-separated ObjectIds (OR across subtrees; used when the
 *                  same category name exists in both give and exchange trees)
 *   areaId       — ObjectId string         (leaf area)
 *   divisionName — string                   (division filter)
 *   cityName     — string                   (city filter)
 *   maxReferencePrice — number              (exchange price cap; when
 *                  listingType is omitted, give listings are still included)
 *   status       — one of LISTING_STATUSES
 *                  (browse defaults to available+pending; owner queries
 *                  include every status when omitted)
 *   search       — case-insensitive substring match on title
 *   limit        — 1..100, default 20
 *   offset       — >=0, default 0
 *
 * Results are sorted newest-first. Returns `{ ok, listings, total, limit,
 * offset }` so the client can paginate.
 */
export async function listListings(req, res, next) {
  try {
    const query = {};

    const listingType = asString(req.query.listingType);
    if (listingType && LISTING_TYPES.includes(listingType)) {
      query.listingType = listingType;
    }

    const ownerUserId = asString(req.query.ownerUserId);
    if (ownerUserId && mongoose.isValidObjectId(ownerUserId)) {
      query.ownerUserId = ownerUserId;
    }

    const categoryIdsRaw = asString(req.query.categoryIds);
    if (categoryIdsRaw) {
      const ids = categoryIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((id) => mongoose.isValidObjectId(id));
      if (ids.length) {
        const categoryFilter = await resolveCategoryFilterIds(ids);
        if (categoryFilter) Object.assign(query, categoryFilter);
      }
    } else {
      const categoryId = asString(req.query.categoryId);
      if (categoryId && mongoose.isValidObjectId(categoryId)) {
        const categoryFilter = await resolveCategoryFilter(categoryId);
        if (categoryFilter) Object.assign(query, categoryFilter);
      }
    }

    const areaId = asString(req.query.areaId);
    if (areaId && mongoose.isValidObjectId(areaId)) {
      query.areaId = areaId;
    }

    const divisionName = asString(req.query.divisionName);
    if (divisionName) {
      query.divisionName = divisionName;
    }

    const cityName = asString(req.query.cityName);
    if (cityName) {
      query.cityName = cityName;
    }

    const maxReferencePrice = Number(req.query.maxReferencePrice);
    if (Number.isFinite(maxReferencePrice) && maxReferencePrice > 0) {
      if (query.listingType === "give") {
        /* Give listings have no reference price — ignore cap. */
      } else if (query.listingType === "exchange") {
        query["exchange.referencePrice"] = { $lte: maxReferencePrice };
      } else {
        query.$or = [
          { listingType: "give" },
          {
            listingType: "exchange",
            "exchange.referencePrice": { $lte: maxReferencePrice },
          },
        ];
      }
    }

    const status = asString(req.query.status);
    if (status && LISTING_STATUSES.includes(status)) {
      query.status = status;
    } else if (!query.ownerUserId) {
      // Default browse should hide accepted/completed/rejected/cancelled
      // listings so claimed items don't show up in fresh search results.
      query.status = { $in: ["available", "pending"] };
    }

    const search = asString(req.query.search);
    if (search) {
      query.title = { $regex: escapeRegex(search), $options: "i" };
    }

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);

    const [items, total] = await Promise.all([
      Listing.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Listing.countDocuments(query),
    ]);

    const listings = await Promise.all(
      items.map((l) => attachOwner(l.toPublicJSON(), req.userId ?? null))
    );
    return res.json({
      ok: true,
      listings,
      total,
      limit,
      offset,
    });
  } catch (err) {
    return next(err);
  }
}

const RELATED_LISTINGS_LIMIT = 6;

/**
 * GET /api/v1/listings/related-by-price
 *
 * Returns up to 6 exchange listings whose reference price falls within
 * [referencePrice / 2, referencePrice * 2] (product detail related strip).
 */
export async function getRelatedListingsByPrice(req, res, next) {
  try {
    const rp = Number(req.query.referencePrice);
    if (!Number.isFinite(rp) || rp < 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message:
          "Query param referencePrice is required and must be a non-negative number",
        errors: { referencePrice: "Invalid estimated price" },
      });
    }

    const minPrice = rp / 2;
    const maxPrice = rp * 2;

    const query = {
      listingType: "exchange",
      "exchange.referencePrice": { $gte: minPrice, $lte: maxPrice },
      status: { $in: ["available", "pending"] },
    };

    const excludeId = asString(req.query.excludeId);
    if (excludeId && mongoose.isValidObjectId(excludeId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const items = await Listing.find(query)
      .sort({ createdAt: -1 })
      .limit(RELATED_LISTINGS_LIMIT);

    const listings = await Promise.all(
      items.map((l) => attachOwner(l.toPublicJSON(), req.userId ?? null))
    );

    return res.json({
      ok: true,
      listings,
      referencePrice: rp,
      minPrice,
      maxPrice,
      limit: RELATED_LISTINGS_LIMIT,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/listings/related-by-category
 *
 * Returns up to 6 give listings in the same leaf category (for product detail
 * "You might also like"). Does not use `relatedIds`.
 */
export async function getRelatedListingsByCategory(req, res, next) {
  try {
    const categoryId = asString(req.query.categoryId);
    if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Query param categoryId is required and must be a valid id",
        errors: { categoryId: "Invalid category id" },
      });
    }

    const query = {
      listingType: "give",
      categoryId: new mongoose.Types.ObjectId(categoryId),
      status: { $in: ["available", "pending"] },
    };

    const excludeId = asString(req.query.excludeId);
    if (excludeId && mongoose.isValidObjectId(excludeId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const items = await Listing.find(query)
      .sort({ createdAt: -1 })
      .limit(RELATED_LISTINGS_LIMIT);

    const listings = await Promise.all(
      items.map((l) => attachOwner(l.toPublicJSON(), req.userId ?? null))
    );

    return res.json({
      ok: true,
      listings,
      categoryId,
      limit: RELATED_LISTINGS_LIMIT,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Editable fields on PATCH /listings/:id. Status / ownership / claim
 * pointers are deliberately excluded — those move via separate flows
 * (claim controller, admin tools).
 */
const PATCHABLE_FIELDS = new Set([
  "title",
  "listingType",
  "imageUrl",
  "gallery",
  "categoryId",
  "areaId",
  "pickupLatitude",
  "pickupLongitude",
  "pickupNotes",
  "story",
  "tags",
  "specs",
  "categoryNote",
  "interestedCategoryNote",
  "exchange",
]);

/**
 * PATCH /api/v1/listings/:id
 *
 * Owner-only edit. Re-runs the same validations as create for any field
 * the caller is touching (image must still live under `/upload/.../product/`,
 * category must still be a leaf in the matching tree, etc.). When the
 * primary image is replaced, the old file is removed from disk so we don't
 * accumulate orphans.
 */
export async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }
    if (String(listing.ownerUserId) !== String(req.userId)) {
      return res.status(403).json({
        ok: false,
        code: "NOT_OWNER",
        message: "Only the owner can edit this listing.",
      });
    }

    const incoming = req.body ?? {};
    // Reject unknown / privileged keys up-front so the client gets a clear
    // error instead of a silent no-op.
    for (const key of Object.keys(incoming)) {
      if (!PATCHABLE_FIELDS.has(key)) {
        return res.status(400).json({
          ok: false,
          code: "FIELD_NOT_PATCHABLE",
          message: `Field "${key}" cannot be edited via PATCH.`,
        });
      }
    }
    if (Object.keys(incoming).length === 0) {
      return res.status(400).json({
        ok: false,
        code: "EMPTY_PATCH",
        message: "Send at least one field to update.",
      });
    }

    // Resolve the effective listingType for this update — needed for both
    // category validation and gating the `exchange` block.
    const effectiveListingType = incoming.listingType ?? listing.listingType;
    if (
      incoming.listingType !== undefined &&
      !LISTING_TYPES.includes(effectiveListingType)
    ) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        errors: { listingType: `Must be one of: ${LISTING_TYPES.join(", ")}` },
      });
    }

    const errors = {};
    let previousImageToDelete = null;

    if (incoming.title !== undefined) {
      const title = asString(incoming.title);
      if (!title) errors.title = "Title is required";
      else if (title.length > MAX_TITLE_LEN) errors.title = "Title is too long";
      else listing.title = title;
    }
    if (incoming.pickupLatitude !== undefined) {
      const lat = parseCoordinate(
        incoming.pickupLatitude,
        "pickupLatitude",
        errors,
        { min: MIN_PICKUP_LAT, max: MAX_PICKUP_LAT }
      );
      if (lat != null) listing.pickupLatitude = lat;
    }
    if (incoming.pickupLongitude !== undefined) {
      const lng = parseCoordinate(
        incoming.pickupLongitude,
        "pickupLongitude",
        errors,
        { min: MIN_PICKUP_LNG, max: MAX_PICKUP_LNG }
      );
      if (lng != null) listing.pickupLongitude = lng;
    }

    const pickupNotesForLocation =
      incoming.pickupNotes !== undefined
        ? asString(incoming.pickupNotes)
        : undefined;

    if (incoming.areaId !== undefined) {
      const areaIdRaw = asString(incoming.areaId);
      if (!areaIdRaw) {
        errors.areaId = "Area is required";
      } else if (!mongoose.isValidObjectId(areaIdRaw)) {
        errors.areaId = "Invalid area id";
      } else {
        const resolved = await resolveAreaLocation(areaIdRaw);
        if (resolved.error === "INVALID_AREA") {
          errors.areaId = "Area not found";
        } else if (resolved.error === "AREA_NOT_LEAF") {
          errors.areaId = "Pick an area";
        } else {
          const { divisionName, cityName, areaName, area } = resolved;
          listing.areaId = area._id;
          listing.divisionName = divisionName;
          listing.cityName = cityName;
          listing.areaName = areaName;
          listing.locationPath = buildLocationPathString({
            divisionName,
            cityName,
            areaName,
          });
          listing.location = buildLocationDisplay({
            areaName,
            cityName,
            divisionName,
            pickupNotes: pickupNotesForLocation ?? "",
          });
        }
      }
    } else if (pickupNotesForLocation !== undefined && listing.areaName) {
      listing.location = buildLocationDisplay({
        areaName: listing.areaName,
        cityName: listing.cityName,
        divisionName: listing.divisionName,
        pickupNotes: pickupNotesForLocation,
      });
    }

    if (incoming.story !== undefined) {
      const story = asString(incoming.story);
      if (!story) errors.story = "Story is required";
      else if (story.length > MAX_STORY_LEN) errors.story = "Story is too long";
      else listing.story = story;
    }
    if (incoming.imageUrl !== undefined) {
      const url = asString(incoming.imageUrl);
      if (!url) {
        errors.imageUrl = "Product image is required";
      } else if (!isOwnedUploadUrl(url, UPLOAD_KINDS.PRODUCT)) {
        errors.imageUrl = "Invalid image reference";
      } else {
        if (listing.imageUrl && listing.imageUrl !== url) {
          previousImageToDelete = listing.imageUrl;
        }
        listing.imageUrl = url;
      }
    }
    if (incoming.gallery !== undefined) {
      const rawGallery = Array.isArray(incoming.gallery) ? incoming.gallery : [];
      const gallery = [];
      for (const entry of rawGallery.slice(0, MAX_GALLERY_IMAGES)) {
        const url = asString(entry);
        if (!url) continue;
        if (!isOwnedUploadUrl(url, UPLOAD_KINDS.PRODUCT)) {
          errors.gallery = "Invalid gallery image reference";
          break;
        }
        gallery.push(url);
      }
      if (!errors.gallery) listing.gallery = gallery;
    }
    if (incoming.tags !== undefined) {
      listing.tags = asStringArray(incoming.tags, {
        max: MAX_TAGS,
        maxLen: MAX_TAG_LEN,
      });
    }
    if (incoming.specs !== undefined) {
      listing.specs =
        incoming.specs &&
        typeof incoming.specs === "object" &&
        !Array.isArray(incoming.specs)
          ? incoming.specs
          : {};
    }
    if (incoming.listingType !== undefined) {
      listing.listingType = effectiveListingType;
    }
    if (
      incoming.exchange !== undefined ||
      incoming.listingType !== undefined
    ) {
      const exchangeIn = incoming.exchange ?? {};
      if (effectiveListingType === "exchange") {
        const next = {
          referencePrice: listing.exchange?.referencePrice ?? null,
          desiredItems: [...(listing.exchange?.desiredItems ?? [])],
        };
        if (
          exchangeIn.referencePrice != null &&
          exchangeIn.referencePrice !== ""
        ) {
          const rp = Number(exchangeIn.referencePrice);
          if (Number.isFinite(rp) && rp >= 0) next.referencePrice = rp;
          else errors.referencePrice = "Estimated price must be a positive number";
        }
        if (exchangeIn.interestedCategoryId !== undefined) {
          const interestedId = asString(exchangeIn.interestedCategoryId);
          if (!interestedId) {
            errors.interestedCategoryId = "Interested item category is required";
          } else if (!mongoose.isValidObjectId(interestedId)) {
            errors.interestedCategoryId = "Invalid interested category id";
          } else {
            const interested = await resolveInterestedCategory(interestedId);
            if (interested.error === "INVALID_INTERESTED_CATEGORY") {
              errors.interestedCategoryId = "Category not found";
            } else if (interested.error === "INTERESTED_CATEGORY_NOT_LEAF") {
              errors.interestedCategoryId = "Pick a leaf category";
            } else if (interested.error === "INTERESTED_CATEGORY_TYPE_MISMATCH") {
              errors.interestedCategoryId = "Must be an exchange category";
            } else {
              next.desiredItems = interested.desiredItems;
            }
          }
        }
        if (!errors.interestedCategoryId) listing.exchange = next;
      } else {
        // Flipped to "give" — clear the exchange block so a stale price
        // doesn't linger.
        listing.exchange = { referencePrice: null, desiredItems: [] };
      }
    }

    // Category may need to change either because the caller sent a new
    // categoryId, or because they flipped listingType (which forces a new
    // category in the other tree).
    if (
      incoming.categoryId !== undefined ||
      incoming.listingType !== undefined
    ) {
      const incomingCatId = incoming.categoryId ?? String(listing.categoryId);
      if (!mongoose.isValidObjectId(incomingCatId)) {
        errors.categoryId = "Invalid category id";
      } else {
        const category = await ListingCategory.findById(incomingCatId);
        if (!category || !category.isActive) {
          errors.categoryId = "Category not found";
        } else if (!(await isListingCategoryLeaf(category))) {
          errors.categoryId = "Pick a leaf category";
        } else if (category.listingType !== effectiveListingType) {
          errors.categoryId = `Category does not match listing type "${effectiveListingType}"`;
        } else {
          listing.categoryId = category._id;
          listing.categoryName = category.name;
          listing.categoryPath = await buildCategoryPath(category);
        }
      }
    }

    let resolvedInterestedCategory = null;
    if (
      effectiveListingType === "exchange" &&
      incoming.exchange?.interestedCategoryId !== undefined
    ) {
      const interestedId = asString(incoming.exchange.interestedCategoryId);
      if (interestedId && mongoose.isValidObjectId(interestedId)) {
        resolvedInterestedCategory =
          await ListingCategory.findById(interestedId);
      }
    }

    if (incoming.categoryNote !== undefined) {
      const categoryNote = asString(incoming.categoryNote);
      if (categoryNote.length > MAX_CATEGORY_NOTE_LEN) {
        errors.categoryNote = "Category note is too long";
      }
    }
    if (incoming.interestedCategoryNote !== undefined) {
      const interestedCategoryNote = asString(incoming.interestedCategoryNote);
      if (interestedCategoryNote.length > MAX_CATEGORY_NOTE_LEN) {
        errors.interestedCategoryNote = "Interested category note is too long";
      }
    }

    const effectiveCategory = await ListingCategory.findById(listing.categoryId);
    const nextCategoryNote =
      incoming.categoryNote !== undefined
        ? asString(incoming.categoryNote)
        : listing.specs?.categoryNote ?? "";
    if (
      effectiveCategory &&
      isOthersLeafCategory(effectiveCategory) &&
      !nextCategoryNote
    ) {
      errors.categoryNote = "Add a note describing your item.";
    }

    const nextInterestedCategoryNote =
      incoming.interestedCategoryNote !== undefined
        ? asString(incoming.interestedCategoryNote)
        : listing.specs?.interestedCategoryNote ?? "";

    let interestedCategoryForSpecs = resolvedInterestedCategory;
    if (
      !interestedCategoryForSpecs &&
      effectiveListingType === "exchange" &&
      (nextInterestedCategoryNote || listing.specs?.interestedCategoryNote)
    ) {
      interestedCategoryForSpecs = await ListingCategory.findOne({
        listingType: "exchange",
        slug: "exchange/others/others",
        isActive: true,
      });
    }

    if (
      effectiveListingType === "exchange" &&
      interestedCategoryForSpecs &&
      isOthersLeafCategory(interestedCategoryForSpecs) &&
      !nextInterestedCategoryNote
    ) {
      errors.interestedCategoryNote =
        "Add a note describing the item you want.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    if (
      incoming.categoryNote !== undefined ||
      incoming.interestedCategoryNote !== undefined ||
      incoming.categoryId !== undefined ||
      incoming.exchange?.interestedCategoryId !== undefined ||
      incoming.listingType !== undefined
    ) {
      listing.specs = buildSpecsWithCategoryNotes({
        specs: listing.specs,
        category: effectiveCategory,
        categoryNote: nextCategoryNote,
        interestedCategory: interestedCategoryForSpecs,
        interestedCategoryNote: nextInterestedCategoryNote,
      });
    }

    await listing.save();

    if (previousImageToDelete) {
      // Fire-and-forget cleanup so the API doesn't block on disk IO.
      deleteStoredImage(previousImageToDelete).catch(() => {});
    }

    return res.json({
      ok: true,
      message: "Listing updated.",
      listing: await attachOwner(listing.toPublicJSON(), req.userId ?? null),
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      const fieldErrors = {};
      for (const [field, detail] of Object.entries(err.errors)) {
        fieldErrors[field] = detail.message;
      }
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        errors: fieldErrors,
      });
    }
    return next(err);
  }
}

/**
 * DELETE /api/v1/listings/:id
 *
 * Owner-only. Removes the row and best-effort deletes the primary image +
 * every gallery image from disk. Idempotent: a second call returns 404.
 */
export async function removeListing(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      });
    }
    if (String(listing.ownerUserId) !== String(req.userId)) {
      return res.status(403).json({
        ok: false,
        code: "NOT_OWNER",
        message: "Only the owner can delete this listing.",
      });
    }

    const imagesToDelete = [listing.imageUrl, ...(listing.gallery ?? [])];
    await listing.deleteOne();
    for (const url of imagesToDelete) {
      deleteStoredImage(url).catch(() => {});
    }

    return res.json({ ok: true, message: "Listing deleted." });
  } catch (err) {
    return next(err);
  }
}
