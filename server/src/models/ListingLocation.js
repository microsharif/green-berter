import mongoose from "mongoose";

/**
 * Strict 3-LEVEL location tree for Bangladesh-style pickup areas:
 *   level 0 = division (root)
 *   level 1 = city
 *   level 2 = area (leaf) — carries default map coordinates
 *
 * `listings.areaId` references LEAVES only.
 */
export const MAX_LOCATION_LEVEL = 2;

const SLUG_SEGMENT = /[a-z0-9]+(?:-[a-z0-9]+)*/;
const SLUG_REGEX = new RegExp(
  `^${SLUG_SEGMENT.source}(?:/${SLUG_SEGMENT.source}){0,${MAX_LOCATION_LEVEL}}$`
);

const listingLocationSchema = new mongoose.Schema(
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
      ref: "ListingLocation",
      default: null,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_LOCATION_LEVEL,
      index: true,
    },
    ancestors: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ListingLocation" }],
      default: [],
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

listingLocationSchema.index({ parentId: 1, sortOrder: 1 });
listingLocationSchema.index({ ancestors: 1 });

listingLocationSchema.pre("validate", function enforceTreeInvariants() {
  const ancestorsLen = Array.isArray(this.ancestors) ? this.ancestors.length : 0;
  if (ancestorsLen !== this.level) {
    throw new Error(
      `ancestors length (${ancestorsLen}) must equal level (${this.level})`
    );
  }
  if (this.level === 0 && this.parentId) {
    throw new Error("root locations must have parentId=null");
  }
  if (this.level > 0 && !this.parentId) {
    throw new Error("non-root locations require a parentId");
  }
  if (this.level === MAX_LOCATION_LEVEL) {
    if (
      typeof this.latitude !== "number" ||
      typeof this.longitude !== "number" ||
      !Number.isFinite(this.latitude) ||
      !Number.isFinite(this.longitude)
    ) {
      throw new Error("leaf locations require latitude and longitude");
    }
  }
});

listingLocationSchema.method("toPublicJSON", function toPublicJSON() {
  const out = {
    id: String(this._id),
    slug: this.slug,
    name: this.name,
    parentId: this.parentId ? String(this.parentId) : null,
    level: this.level,
    ancestors: (this.ancestors ?? []).map((id) => String(id)),
    sortOrder: this.sortOrder,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
  if (this.level === MAX_LOCATION_LEVEL) {
    out.latitude = this.latitude;
    out.longitude = this.longitude;
  }
  return out;
});

const ListingLocation = mongoose.model(
  "ListingLocation",
  listingLocationSchema,
  "listing_locations"
);
export default ListingLocation;
