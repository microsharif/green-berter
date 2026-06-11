import { useEffect, useId, useRef, useState } from "react";
import { useUI } from "../../context/UIContext.jsx";
import { fetchListing, updateListing } from "../../api/listings.js";
import { fetchLocationById } from "../../api/locations.js";
import { fetchCategoryById } from "../../api/categories.js";
import { uploadProductImage } from "../../api/uploads.js";
import { LocationCascade } from "../upload/LocationFields.jsx";
import PickupLocationMap from "../upload/PickupLocationMap.jsx";
import { ApiError } from "../../api/client.js";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";
import { isGive } from "../products/productUtils.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { CategoryCascade } from "../upload/CategoryFields.jsx";
import { isCategoryLeaf } from "../../constants/categoryLevels.js";
import { isOthersCategoryPath } from "../../utils/categoryOthers.js";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-[#fcf9f8] border border-zinc-200/80 focus:ring-2 focus:ring-primary/40 focus:border-primary/30 text-on-surface placeholder:text-on-surface-variant/50 text-base transition-all disabled:opacity-60";

const labelClass = "block text-sm font-bold text-green-900";

function uploadErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.code === "FILE_TOO_LARGE") return "Image must be 5MB or smaller.";
    if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
      return "Use a JPG, PNG, WebP, or GIF image.";
    }
    if (err.code === "NETWORK_ERROR") {
      return "Could not reach the server. Check your connection.";
    }
    return err.message || "Could not upload the photo.";
  }
  return "Could not upload the photo.";
}

function parsePickupNotesFromLocation(locationStr) {
  if (typeof locationStr !== "string") return "";
  const sep = " — ";
  const idx = locationStr.indexOf(sep);
  if (idx === -1) return "";
  return locationStr.slice(idx + sep.length).trim();
}

function buildInitialForm(product, apiListing) {
  const listing = apiListing ?? product?._api ?? {};
  const locationStr = listing.location ?? product?.location ?? "";
  return {
    title: listing.title ?? product?.title ?? "",
    pickupNotes: parsePickupNotesFromLocation(locationStr),
    story: listing.story ?? product?.narrative ?? "",
    imageUrl: listing.imageUrl ?? "",
    referencePrice:
      listing.exchange?.referencePrice != null
        ? String(listing.exchange.referencePrice)
        : "",
    interestedCategoryLabel:
      listing.exchange?.desiredItems?.[0] ??
      product?.exchange?.desiredItems?.[0] ??
      "",
    categoryNote: listing.specs?.categoryNote ?? "",
    interestedCategoryNote: listing.specs?.interestedCategoryNote ?? "",
  };
}

/**
 * Owner listing editor form — used in EditListingModal and AllListingsTableModal panel.
 */
export default function EditListingForm({
  product,
  onClose,
  onSaved,
  /** When false, Escape is handled by the parent (e.g. table modal). */
  closeOnEscape = true,
}) {
  const titleId = useId();
  const { showToast } = useUI();
  const fileInputRef = useRef(null);

  const listingType = product?.listingType ?? "give";
  const isExchange = listingType === "exchange";

  const [form, setForm] = useState(() => buildInitialForm(product));
  const [fieldErrors, setFieldErrors] = useState({});
  const [categoryPath, setCategoryPath] = useState([]);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [changeCategory, setChangeCategory] = useState(false);
  const [interestedCategoryPath, setInterestedCategoryPath] = useState([]);
  const [changeInterestedCategory, setChangeInterestedCategory] = useState(false);
  const [locationPath, setLocationPath] = useState([]);
  const [pickupLatitude, setPickupLatitude] = useState(null);
  const [pickupLongitude, setPickupLongitude] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedListing, setLoadedListing] = useState(null);
  const [originalPickupNotes, setOriginalPickupNotes] = useState("");
  const [locationTouched, setLocationTouched] = useState(false);

  useEffect(() => {
    if (!product?.id) return undefined;

    setForm(buildInitialForm(product));
    setFieldErrors({});
    setCategoryPath([]);
    setCategoryTouched(false);
    setChangeCategory(false);
    setInterestedCategoryPath([]);
    setChangeInterestedCategory(false);
    setLocationPath([]);
    setPickupLatitude(null);
    setPickupLongitude(null);
    setImagePreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingFile(null);
    setLoadedListing(null);
    setOriginalPickupNotes("");
    setLocationTouched(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    let cancelled = false;
    setRefreshing(true);

    async function hydrateLocation(areaId, listingCoords) {
      try {
        const { breadcrumb } = await fetchLocationById(areaId);
        if (cancelled || !breadcrumb.length) return;
        setLocationPath(breadcrumb);
        setPickupLatitude(
          listingCoords?.latitude ??
            breadcrumb[breadcrumb.length - 1]?.latitude ??
            null
        );
        setPickupLongitude(
          listingCoords?.longitude ??
            breadcrumb[breadcrumb.length - 1]?.longitude ??
            null
        );
      } catch {
        /* User can re-select location manually. */
      }
    }

    const initialNotes = parsePickupNotesFromLocation(
      product?.location ?? product?._api?.location ?? ""
    );
    setOriginalPickupNotes(initialNotes);

    const seedAreaId = product?.areaId ?? product?._api?.areaId;
    if (seedAreaId) {
      hydrateLocation(seedAreaId, {
        latitude: product?.pickupLatitude ?? product?._api?.pickupLatitude,
        longitude: product?.pickupLongitude ?? product?._api?.pickupLongitude,
      });
    }

    (async () => {
      try {
        const fresh = await fetchListing(product.id);
        if (cancelled) return;
        setLoadedListing(fresh);
        const notes = parsePickupNotesFromLocation(fresh?.location ?? "");
        setOriginalPickupNotes(notes);
        setForm(buildInitialForm(product, fresh));
        if (fresh?.areaId) {
          await hydrateLocation(fresh.areaId, {
            latitude: fresh.pickupLatitude,
            longitude: fresh.pickupLongitude,
          });
        } else if (!cancelled) {
          setPickupLatitude(fresh?.pickupLatitude ?? null);
          setPickupLongitude(fresh?.pickupLongitude ?? null);
        }
      } catch {
        if (!cancelled) setForm(buildInitialForm(product));
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  useEffect(() => {
    if (!closeOnEscape) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape" && !pending) onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOnEscape, pending, onClose]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (!product) return null;

  const imageDisplay =
    imagePreview ||
    (form.imageUrl ? resolveMediaUrl(form.imageUrl) : product.imageUrl);

  const areaLeaf = locationPath[locationPath.length - 1];
  const showPickupMap =
    areaLeaf?.level === 2 ||
    (pickupLatitude != null &&
      pickupLongitude != null &&
      (loadedListing?.areaId || product?.areaId));

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function selectInterestedCategoryAtDepth(depth, selection) {
    setInterestedCategoryPath((prev) => {
      const next = prev.slice(0, depth);
      if (selection) next.push(selection);
      return next;
    });
    const next = interestedCategoryPath.slice(0, depth);
    if (selection) next.push(selection);
    if (!isOthersCategoryPath(next)) {
      setField("interestedCategoryNote", "");
    }
  }

  function selectCategoryAtDepth(depth, selection) {
    setCategoryTouched(true);
    setCategoryPath((prev) => {
      const next = prev.slice(0, depth);
      if (selection) next.push(selection);
      return next;
    });
    if (!isOthersCategoryPath(
      (() => {
        const next = categoryPath.slice(0, depth);
        if (selection) next.push(selection);
        return next;
      })()
    )) {
      setField("categoryNote", "");
    }
  }

  function selectLocationAtDepth(depth, selection) {
    setLocationTouched(true);
    setLocationPath((prev) => {
      const next = prev.slice(0, depth);
      if (selection) next.push(selection);
      return next;
    });
    if (selection?.level === 2) {
      setPickupLatitude(selection.latitude ?? null);
      setPickupLongitude(selection.longitude ?? null);
    } else if (!selection || depth < locationPath.length) {
      setPickupLatitude(null);
      setPickupLongitude(null);
    }
  }

  async function applyImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (JPG, PNG, or WebP).", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be 5MB or smaller.", "error");
      return;
    }
    setPendingFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function openCategoryEditor() {
    setChangeCategory(true);
    if (categoryPath.length > 0) return;

    const categoryId =
      loadedListing?.categoryId ?? product?.categoryId ?? product?._api?.categoryId;
    if (!categoryId) return;

    try {
      const { breadcrumb } = await fetchCategoryById(categoryId);
      if (breadcrumb.length) setCategoryPath(breadcrumb);
    } catch {
      /* User can pick a new category manually. */
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending || refreshing) return;

    const errors = {};
    const title = form.title.trim();
    const story = form.story.trim();

    if (!title) errors.title = "Title is required";
    if (!story) errors.story = "Description is required";

    const pickupNotesTrimmed = form.pickupNotes.trim();
    const pickupNotesChanged = pickupNotesTrimmed !== originalPickupNotes;
    const baselineListing = loadedListing ?? product?._api ?? null;

    if (locationTouched) {
      const areaLeaf = locationPath[locationPath.length - 1];
      if (!areaLeaf || areaLeaf.level !== 2) {
        errors.areaId = "Select division, city, and area.";
      } else if (pickupLatitude == null || pickupLongitude == null) {
        errors.pickupLatitude = "Confirm pickup location on the map.";
      }
    } else if (!baselineListing?.areaId && !product?.areaId) {
      errors.areaId = "Select division, city, and area.";
    }

    const leaf = categoryPath[categoryPath.length - 1];
    if (changeCategory && categoryTouched) {
      if (!leaf || !isCategoryLeaf(leaf)) {
        errors.categoryId = "Pick a category through the deepest level.";
      }
    }

    const usesOthersCategory =
      isOthersCategoryPath(categoryPath) ||
      Boolean(
        loadedListing?.specs?.categoryNote ??
          product?._api?.specs?.categoryNote
      );
    if (usesOthersCategory && !form.categoryNote.trim()) {
      errors.categoryNote = "Add a note describing your item.";
    }

    if (isExchange) {
      const interestedLeaf =
        interestedCategoryPath[interestedCategoryPath.length - 1];
      const mustPickInterested =
        changeInterestedCategory || !form.interestedCategoryLabel;
      if (mustPickInterested && (!interestedLeaf || !isCategoryLeaf(interestedLeaf))) {
        errors.interestedCategoryId =
          "Select an interested item category through the deepest level.";
      }

      const usesOthersInterested =
        isOthersCategoryPath(interestedCategoryPath) ||
        Boolean(
          loadedListing?.specs?.interestedCategoryNote ??
            product?._api?.specs?.interestedCategoryNote
        );
      if (usesOthersInterested && !form.interestedCategoryNote.trim()) {
        errors.interestedCategoryNote =
          "Add a note describing the item you want.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setFieldErrors({});

    try {
      const patch = {
        title,
        story,
      };

      if (locationTouched) {
        const areaLeaf = locationPath[locationPath.length - 1];
        patch.areaId = areaLeaf.id;
        patch.pickupLatitude = pickupLatitude;
        patch.pickupLongitude = pickupLongitude;
        patch.pickupNotes = pickupNotesTrimmed;
      } else if (pickupNotesChanged) {
        patch.pickupNotes = pickupNotesTrimmed;
      }

      if (changeCategory && categoryTouched && leaf?.id) {
        patch.categoryId = leaf.id;
      }
      if (isOthersCategoryPath(categoryPath) || form.categoryNote.trim()) {
        patch.categoryNote = form.categoryNote.trim();
      }

      if (pendingFile) {
        try {
          const uploaded = await uploadProductImage(pendingFile);
          patch.imageUrl = uploaded?.url;
        } catch (err) {
          showToast(uploadErrorMessage(err), "error");
          return;
        }
      }

      if (isExchange) {
        const interestedLeaf =
          interestedCategoryPath[interestedCategoryPath.length - 1];
        patch.exchange = {
          referencePrice:
            form.referencePrice === "" ? null : Number(form.referencePrice),
        };
        if (interestedLeaf?.id) {
          patch.exchange.interestedCategoryId = interestedLeaf.id;
        }
        if (
          isOthersCategoryPath(interestedCategoryPath) ||
          form.interestedCategoryNote.trim()
        ) {
          patch.interestedCategoryNote = form.interestedCategoryNote.trim();
        }
      }

      const updated = await updateListing(product.id, patch);
      showToast(`“${updated?.title ?? title}” was updated.`, "success");
      onSaved?.(updated);
      onClose?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
        const first = err.fieldErrors
          ? Object.values(err.fieldErrors)[0]
          : null;
        showToast(first ?? err.message ?? "Could not save changes.", "error");
      } else {
        showToast("Could not save changes. Please try again.", "error");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col min-h-0 h-full bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="min-w-0 pr-3">
          <h2
            id={titleId}
            className="text-lg font-black text-green-900 dark:text-green-100 tracking-tight"
          >
            Edit listing
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">
            {product.title}
            {refreshing ? (
              <span className="ml-2 text-xs text-zinc-400">Updating…</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-green-800 transition-colors disabled:opacity-50 shrink-0"
          aria-label="Close editor"
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`flex flex-col min-h-0 flex-1 overflow-hidden transition-opacity duration-200 ${
          refreshing ? "opacity-80" : "opacity-100"
        }`}
      >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  isGive(listingType)
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}
              >
                {isGive(listingType) ? "GIVE" : "EXCHANGE"}
              </span>
              <span className="text-xs text-zinc-400">
                Listing type cannot be changed here
              </span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <img
                src={imageDisplay}
                alt=""
                className="w-full max-h-48 object-cover rounded-2xl border border-zinc-200/80"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending}
                className="px-4 py-2 text-sm font-bold text-green-800 bg-green-50 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                Change photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => applyImageFile(e.target.files?.[0])}
              />
              {fieldErrors.imageUrl ? (
                <p className="text-sm text-red-600">{fieldErrors.imageUrl}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="edit-listing-title" className={labelClass}>
                Item title
              </label>
              <input
                id="edit-listing-title"
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className={`${inputClass} mt-1.5`}
                disabled={pending}
              />
              {fieldErrors.title ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
              ) : null}
            </div>

            <div>
              <p className={labelClass}>Category</p>
              <p className="text-sm text-zinc-600 mt-1 mb-2">
                {product.categoryPath || product.categoryName || "—"}
              </p>
              {!changeCategory ? (
                <>
                  <button
                    type="button"
                    onClick={openCategoryEditor}
                    className="text-sm font-bold text-green-800 hover:underline"
                  >
                    Change category
                  </button>
                  {form.categoryNote ? (
                    <div className="mt-4">
                      <label htmlFor="edit-listing-category-note" className={labelClass}>
                        Note
                      </label>
                      <textarea
                        id="edit-listing-category-note"
                        rows={3}
                        value={form.categoryNote}
                        onChange={(e) => setField("categoryNote", e.target.value)}
                        className={`${inputClass} mt-1.5 resize-y min-h-[5rem]`}
                        disabled={pending}
                        placeholder="Describe what kind of item this is…"
                      />
                      {fieldErrors.categoryNote ? (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.categoryNote}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <CategoryCascade
                  listingType={listingType}
                  categoryPath={categoryPath}
                  onSelectAtDepth={selectCategoryAtDepth}
                  idPrefix="edit-listing-category"
                  othersNote={form.categoryNote}
                  onOthersNoteChange={(value) => setField("categoryNote", value)}
                />
              )}
              {fieldErrors.categoryId ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.categoryId}</p>
              ) : null}
              {changeCategory && fieldErrors.categoryNote ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.categoryNote}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className={labelClass}>Pickup location</p>
              {product.locationPath || product.location ? (
                <p className="text-sm text-zinc-600">
                  Current: {product.locationPath || product.location}
                </p>
              ) : null}
              <LocationCascade
                locationPath={locationPath}
                onSelectAtDepth={selectLocationAtDepth}
              />
              {showPickupMap ? (
                <PickupLocationMap
                  latitude={pickupLatitude}
                  longitude={pickupLongitude}
                  onCoordinatesChange={(lat, lng) => {
                    setLocationTouched(true);
                    setPickupLatitude(lat);
                    setPickupLongitude(lng);
                  }}
                />
              ) : null}
              <div>
                <label htmlFor="edit-listing-pickup-notes" className={labelClass}>
                  Pickup notes <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  id="edit-listing-pickup-notes"
                  type="text"
                  value={form.pickupNotes}
                  onChange={(e) => setField("pickupNotes", e.target.value)}
                  className={`${inputClass} mt-1.5`}
                  disabled={pending}
                  placeholder="e.g. near main gate"
                />
              </div>
              {fieldErrors.areaId || fieldErrors.pickupLatitude ? (
                <p className="text-sm text-red-600">
                  {fieldErrors.areaId ?? fieldErrors.pickupLatitude}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="edit-listing-story" className={labelClass}>
                Story &amp; description
              </label>
              <textarea
                id="edit-listing-story"
                rows={4}
                value={form.story}
                onChange={(e) => setField("story", e.target.value)}
                className={`${inputClass} mt-1.5 resize-y min-h-[6rem] leading-relaxed`}
                disabled={pending}
              />
              {fieldErrors.story ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.story}</p>
              ) : null}
            </div>

            {isExchange ? (
              <div className="border-t border-zinc-100 pt-4 space-y-6">
                <p className="text-sm font-bold text-secondary uppercase tracking-wider">
                  Exchange details
                </p>
                <div>
                  <label htmlFor="edit-listing-price" className={labelClass}>
                    Estimated Price (BDT)
                  </label>
                  <input
                    id="edit-listing-price"
                    type="number"
                    min="0"
                    value={form.referencePrice}
                    onChange={(e) => setField("referencePrice", e.target.value)}
                    className={`${inputClass} mt-1.5`}
                    disabled={pending}
                  />
                  {fieldErrors.referencePrice ? (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.referencePrice}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className={labelClass}>Interested item</p>
                  {form.interestedCategoryLabel ? (
                    <p className="text-sm text-zinc-600 mt-1 mb-2">
                      Current: {form.interestedCategoryLabel}
                    </p>
                  ) : null}
                  {!changeInterestedCategory ? (
                    <button
                      type="button"
                      onClick={() => setChangeInterestedCategory(true)}
                      className="text-sm font-bold text-green-800 hover:underline"
                    >
                      Change interested category
                    </button>
                  ) : (
                    <CategoryCascade
                      listingType="exchange"
                      categoryPath={interestedCategoryPath}
                      onSelectAtDepth={selectInterestedCategoryAtDepth}
                      idPrefix="edit-interested-category"
                      othersNote={form.interestedCategoryNote}
                      onOthersNoteChange={(value) =>
                        setField("interestedCategoryNote", value)
                      }
                    />
                  )}
                  {fieldErrors.interestedCategoryId ? (
                    <p className="mt-1 text-sm text-red-600">
                      {fieldErrors.interestedCategoryId}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-[#fcf9f8]/80 dark:bg-zinc-900/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 py-3 font-bold text-green-800 bg-white border border-green-800/15 rounded-full hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || refreshing}
              className="flex-1 py-3 font-bold text-white bg-primary rounded-full shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
    </div>
  );
}
