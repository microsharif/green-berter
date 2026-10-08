import mongoose from "mongoose";
import ListingCategory from "../../models/ListingCategory.js";
import ListingLocation, {
  MAX_LOCATION_LEVEL,
} from "../../models/ListingLocation.js";
import { writeAdminAudit } from "../../utils/adminAudit.js";

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function slugify(value) {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ----------------------------- Categories ------------------------------ */

/**
 * GET /api/v1/admin/categories?listingType=&parentId=
 *
 * Lists direct children of a node (or level-1 nodes when no parent) — unlike
 * the public endpoint, inactive rows are included for management.
 */
export async function listCategories(req, res, next) {
  try {
    const listingType = asString(req.query.listingType);
    const filter = {};
    if (listingType) filter.listingType = listingType;

    const parentId = asString(req.query.parentId);
    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_PARENT_ID",
          message: "parentId is not a valid ObjectId.",
        });
      }
      filter.parentId = new mongoose.Types.ObjectId(parentId);
    } else {
      filter.level = 1;
    }

    const categories = await ListingCategory.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });
    return res.json({
      ok: true,
      categories: categories.map((c) => c.toPublicJSON()),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/admin/categories
 *
 * Creates a category under an existing parent. Roots (give/exchange) are seed
 * managed and cannot be created here.
 */
export async function createCategory(req, res, next) {
  try {
    const name = asString(req.body?.name);
    const parentId = asString(req.body?.parentId);
    const sortOrder = Number.parseInt(req.body?.sortOrder, 10) || 0;

    const errors = {};
    if (!name) errors.name = "Name is required";
    if (!parentId) errors.parentId = "parentId is required";
    else if (!mongoose.isValidObjectId(parentId)) {
      errors.parentId = "parentId is not a valid ObjectId.";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    const parent = await ListingCategory.findById(parentId);
    if (!parent) {
      return res.status(404).json({
        ok: false,
        code: "PARENT_NOT_FOUND",
        message: "Parent category not found.",
      });
    }

    const level = parent.level + 1;
    const slug = `${parent.slug}/${slugify(name)}`;
    const category = new ListingCategory({
      name,
      slug,
      parentId: parent._id,
      level,
      ancestors: [...parent.ancestors, parent._id],
      listingType: parent.listingType,
      sortOrder,
      isActive: true,
    });
    await category.save();

    await writeAdminAudit(req, {
      entityType: "listing_category",
      entityId: category._id,
      action: "create",
      newState: { name, slug, level },
    });

    return res.status(201).json({
      ok: true,
      message: "Category created.",
      category: category.toPublicJSON(),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        ok: false,
        code: "SLUG_TAKEN",
        message: "A category with this slug already exists.",
      });
    }
    if (err instanceof mongoose.Error.ValidationError || err instanceof Error) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: err.message || "Invalid category.",
      });
    }
    return next(err);
  }
}

/**
 * PATCH /api/v1/admin/categories/:id
 *
 * Rename, reorder, or toggle active state.
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found.",
      });
    }

    const category = await ListingCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        ok: false,
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found.",
      });
    }

    const previous = {
      name: category.name,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    };
    if (req.body?.name !== undefined) {
      const name = asString(req.body.name);
      if (!name) {
        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Name cannot be empty.",
        });
      }
      category.name = name;
    }
    if (req.body?.sortOrder !== undefined) {
      category.sortOrder = Number.parseInt(req.body.sortOrder, 10) || 0;
    }
    if (req.body?.isActive !== undefined) {
      category.isActive = Boolean(req.body.isActive);
    }
    await category.save();

    await writeAdminAudit(req, {
      entityType: "listing_category",
      entityId: category._id,
      action: "update",
      previousState: previous,
      newState: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      },
    });

    return res.json({
      ok: true,
      message: "Category updated.",
      category: category.toPublicJSON(),
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------ Locations ------------------------------ */

/**
 * GET /api/v1/admin/locations?parentId=
 *
 * Direct children of a node (or divisions when no parent). Inactive included.
 */
export async function listLocations(req, res, next) {
  try {
    const filter = {};
    const parentId = asString(req.query.parentId);
    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_PARENT_ID",
          message: "parentId is not a valid ObjectId.",
        });
      }
      filter.parentId = new mongoose.Types.ObjectId(parentId);
    } else {
      filter.level = 0;
    }

    const locations = await ListingLocation.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });
    return res.json({
      ok: true,
      locations: locations.map((l) => l.toPublicJSON()),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/admin/locations
 *
 * Creates a location under an existing parent (level-2 leaves require coords).
 */
export async function createLocation(req, res, next) {
  try {
    const name = asString(req.body?.name);
    const parentId = asString(req.body?.parentId);
    const sortOrder = Number.parseInt(req.body?.sortOrder, 10) || 0;

    const errors = {};
    if (!name) errors.name = "Name is required";
    if (!parentId) errors.parentId = "parentId is required";
    else if (!mongoose.isValidObjectId(parentId)) {
      errors.parentId = "parentId is not a valid ObjectId.";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        errors,
      });
    }

    const parent = await ListingLocation.findById(parentId);
    if (!parent) {
      return res.status(404).json({
        ok: false,
        code: "PARENT_NOT_FOUND",
        message: "Parent location not found.",
      });
    }

    const level = parent.level + 1;
    const doc = {
      name,
      slug: `${parent.slug}/${slugify(name)}`,
      parentId: parent._id,
      level,
      ancestors: [...parent.ancestors, parent._id],
      sortOrder,
      isActive: true,
    };
    if (level === MAX_LOCATION_LEVEL) {
      const latitude = Number(req.body?.latitude);
      const longitude = Number(req.body?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Area-level locations require latitude and longitude.",
          errors: { latitude: "Required", longitude: "Required" },
        });
      }
      doc.latitude = latitude;
      doc.longitude = longitude;
    }

    const location = new ListingLocation(doc);
    await location.save();

    await writeAdminAudit(req, {
      entityType: "listing_location",
      entityId: location._id,
      action: "create",
      newState: { name, slug: doc.slug, level },
    });

    return res.status(201).json({
      ok: true,
      message: "Location created.",
      location: location.toPublicJSON(),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        ok: false,
        code: "SLUG_TAKEN",
        message: "A location with this slug already exists.",
      });
    }
    if (err instanceof mongoose.Error.ValidationError || err instanceof Error) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: err.message || "Invalid location.",
      });
    }
    return next(err);
  }
}

/**
 * PATCH /api/v1/admin/locations/:id
 *
 * Rename, reorder, toggle active, or update leaf coordinates.
 */
export async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LOCATION_NOT_FOUND",
        message: "Location not found.",
      });
    }

    const location = await ListingLocation.findById(id);
    if (!location) {
      return res.status(404).json({
        ok: false,
        code: "LOCATION_NOT_FOUND",
        message: "Location not found.",
      });
    }

    const previous = {
      name: location.name,
      sortOrder: location.sortOrder,
      isActive: location.isActive,
    };
    if (req.body?.name !== undefined) {
      const name = asString(req.body.name);
      if (!name) {
        return res.status(400).json({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Name cannot be empty.",
        });
      }
      location.name = name;
    }
    if (req.body?.sortOrder !== undefined) {
      location.sortOrder = Number.parseInt(req.body.sortOrder, 10) || 0;
    }
    if (req.body?.isActive !== undefined) {
      location.isActive = Boolean(req.body.isActive);
    }
    if (
      location.level === MAX_LOCATION_LEVEL &&
      (req.body?.latitude !== undefined || req.body?.longitude !== undefined)
    ) {
      if (req.body.latitude !== undefined) {
        location.latitude = Number(req.body.latitude);
      }
      if (req.body.longitude !== undefined) {
        location.longitude = Number(req.body.longitude);
      }
    }
    await location.save();

    await writeAdminAudit(req, {
      entityType: "listing_location",
      entityId: location._id,
      action: "update",
      previousState: previous,
      newState: {
        name: location.name,
        sortOrder: location.sortOrder,
        isActive: location.isActive,
      },
    });

    return res.json({
      ok: true,
      message: "Location updated.",
      location: location.toPublicJSON(),
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError || err instanceof Error) {
      return res.status(400).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: err.message || "Invalid location.",
      });
    }
    return next(err);
  }
}
