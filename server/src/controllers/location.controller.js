import mongoose from "mongoose";
import ListingLocation, { MAX_LOCATION_LEVEL } from "../models/ListingLocation.js";

/**
 * GET /api/v1/locations
 *
 * Returns direct children of a parent node for the Division → City → Area
 * cascade on the upload form.
 *
 * Query params:
 *   parentId  optional  ObjectId of parent. Omit for level-0 divisions.
 */
export async function listLocations(req, res, next) {
  try {
    const filter = { isActive: true };

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
      const parent = await ListingLocation.findOne({
        _id: parentIdRaw,
        isActive: true,
      })
        .select("_id")
        .lean();
      if (!parent) {
        return res.status(404).json({
          ok: false,
          code: "PARENT_NOT_FOUND",
          message: "Parent location not found.",
        });
      }
      filter.parentId = parent._id;
    } else {
      filter.level = 0;
    }

    const locations = await ListingLocation.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });

    return res.json({
      ok: true,
      locations: locations.map((loc) => loc.toPublicJSON()),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/locations/:id
 *
 * Returns one node plus breadcrumb segments (for edit-form rehydration).
 */
export async function getLocation(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        ok: false,
        code: "LOCATION_NOT_FOUND",
        message: "Location not found.",
      });
    }

    const node = await ListingLocation.findOne({ _id: id, isActive: true });
    if (!node) {
      return res.status(404).json({
        ok: false,
        code: "LOCATION_NOT_FOUND",
        message: "Location not found.",
      });
    }

    const ancestorIds = node.ancestors ?? [];
    const ancestors = ancestorIds.length
      ? await ListingLocation.find({ _id: { $in: ancestorIds } })
          .select("_id name level latitude longitude")
          .lean()
      : [];
    const byId = new Map(ancestors.map((a) => [String(a._id), a]));

    const breadcrumb = ancestorIds
      .map((aid) => byId.get(String(aid)))
      .filter(Boolean)
      .map((a) => ({
        id: String(a._id),
        name: a.name,
        level: a.level,
      }));

    breadcrumb.push({
      id: String(node._id),
      name: node.name,
      level: node.level,
      ...(node.level === MAX_LOCATION_LEVEL
        ? { latitude: node.latitude, longitude: node.longitude }
        : {}),
    });

    return res.json({
      ok: true,
      location: node.toPublicJSON(),
      breadcrumb,
    });
  } catch (err) {
    return next(err);
  }
}
