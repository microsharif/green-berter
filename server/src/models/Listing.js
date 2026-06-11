import mongoose from "mongoose";
import { LISTING_TYPES } from "./ListingCategory.js";

/**
 * Lifecycle of a single listing — every transition is owner- or
 * claim-controller-driven. New listings start at `available` per the upload
 * DFD ("INSERT listing row (status: available)").
 */
export const LISTING_STATUSES = Object.freeze([
  "available",
  "pending",
  "accepted",
  "completed",
  "rejected",
  "cancelled",
]);

const ObjectId = mongoose.Schema.Types.ObjectId;

/**
 * `exchange` is meaningful only when the parent `listingType === "exchange"`.
 * For `give` listings the sub-document is still present (so reading code can
 * blindly do `listing.exchange?.desiredItems`) but stays at its defaults.
 */
const exchangeSubSchema = new mongoose.Schema(
  {
    referencePrice: { type: Number, min: 0, default: null },
    desiredItems: { type: [String], default: [] },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: ObjectId,
      ref: "User",
      required: [true, "ownerUserId is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
      maxlength: 200,
    },
    listingType: {
      type: String,
      enum: LISTING_TYPES,
      required: true,
      index: true,
    },
    /**
     * Public URL of the primary product image. Always one we minted from
     * `POST /api/v1/upload/product-image` — the controller verifies that
     * before persisting (via `isOwnedUploadUrl(url, UPLOAD_KINDS.PRODUCT)`).
     */
    imageUrl: {
      type: String,
      required: [true, "imageUrl is required"],
      trim: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    /**
     * Always references a leaf in listing_categories (no active children).
     * The two denormalised fields below let callers render the breadcrumb
     * without `$lookup`/populate.
     */
    categoryId: {
      type: ObjectId,
      ref: "ListingCategory",
      required: [true, "categoryId is required"],
      index: true,
    },
    categoryName: { type: String, required: true },
    /**
     * Breadcrumb-style path: "Give > Home & Living > Furniture > Chairs".
     * Recomputed from the category's ancestors at write time, never edited
     * directly by the client.
     */
    categoryPath: { type: String, required: true },
    location: {
      type: String,
      required: [true, "location is required"],
      trim: true,
      maxlength: 200,
    },
    areaId: {
      type: ObjectId,
      ref: "ListingLocation",
      default: null,
      index: true,
    },
    divisionName: { type: String, default: null },
    cityName: { type: String, default: null },
    areaName: { type: String, default: null },
    locationPath: { type: String, default: null },
    pickupLatitude: { type: Number, default: null },
    pickupLongitude: { type: Number, default: null },
    story: {
      type: String,
      required: [true, "story is required"],
      trim: true,
      maxlength: 5000,
    },
    tags: { type: [String], default: [] },
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    exchange: { type: exchangeSubSchema, default: () => ({}) },
    status: {
      type: String,
      enum: LISTING_STATUSES,
      default: "available",
      index: true,
    },
    /**
     * Set when a claim is accepted (Section 4 of the feature spec). The
     * upload flow itself never touches these — they're owned by the claim
     * controller, which is not implemented yet.
     */
    claimedByUserId: { type: ObjectId, ref: "User", default: null },
    acceptedClaimId: { type: ObjectId, ref: "Claim", default: null },
    /**
     * Curator-managed list of "see also" listings. Empty by default; the
     * upload controller does not set this.
     */
    relatedIds: { type: [ObjectId], default: [] },
  },
  { timestamps: true }
);

// Browse page query: "give listings, available, newest first".
listingSchema.index({ listingType: 1, status: 1, createdAt: -1 });
// Profile "my listings" panel.
listingSchema.index({ ownerUserId: 1, createdAt: -1 });
// Category-filtered browse.
listingSchema.index({ categoryId: 1, status: 1, createdAt: -1 });

/**
 * Public shape returned to API consumers. Stringifies every ObjectId so the
 * client can compare them directly without coercion.
 */
listingSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = String(obj._id);
  delete obj._id;
  obj.ownerUserId = String(obj.ownerUserId);
  obj.categoryId = String(obj.categoryId);
  if (obj.areaId) obj.areaId = String(obj.areaId);
  if (obj.claimedByUserId) obj.claimedByUserId = String(obj.claimedByUserId);
  if (obj.acceptedClaimId) obj.acceptedClaimId = String(obj.acceptedClaimId);
  obj.relatedIds = (obj.relatedIds ?? []).map((id) => String(id));
  return obj;
});

const Listing = mongoose.model("Listing", listingSchema, "listings");
export default Listing;
