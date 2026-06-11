import { useState } from "react";
import { useProgressNavigate } from "../../hooks/useNavigationProgress.js";
import { useUI } from "../../context/UIContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useUploadDraft } from "../../context/UploadDraftContext.jsx";
import { createListing } from "../../api/listings.js";
import { ApiError } from "../../api/client.js";
import { isCategoryLeaf } from "../../constants/categoryLevels.js";
import { isOthersCategoryPath } from "../../utils/categoryOthers.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

function buildPayload(draft) {
  const leaf = draft.categoryPath[draft.categoryPath.length - 1];
  const areaLeaf = draft.locationPath[draft.locationPath.length - 1];
  const isExchange = draft.listingType === "exchange";

  const payload = {
    title: String(draft.title || "").trim(),
    listingType: isExchange ? "exchange" : "give",
    imageUrl: String(draft.imageUrl || "").trim(),
    categoryId: leaf?.id,
    areaId: areaLeaf?.id,
    pickupLatitude: draft.pickupLatitude,
    pickupLongitude: draft.pickupLongitude,
    pickupNotes: String(draft.pickupNotes || "").trim(),
    story: String(draft.story || "").trim(),
  };

  if (isOthersCategoryPath(draft.categoryPath)) {
    payload.categoryNote = String(draft.categoryNote || "").trim();
  }

  if (isExchange) {
    const interestedLeaf =
      draft.interestedCategoryPath[draft.interestedCategoryPath.length - 1];
    payload.exchange = {
      referencePrice:
        draft.referencePrice === "" ? null : Number(draft.referencePrice),
      interestedCategoryId: interestedLeaf?.id,
    };
    if (isOthersCategoryPath(draft.interestedCategoryPath)) {
      payload.interestedCategoryNote = String(
        draft.interestedCategoryNote || ""
      ).trim();
    }
  }
  return payload;
}

export default function ListingSubmitBar() {
  const { showToast } = useUI();
  const { draft, resetDraft } = useUploadDraft();
  const { user } = useAuth();
  const { refreshListings } = useCatalog();
  const navigate = useProgressNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function handlePost() {
    if (submitting) return;
    if (!user) {
      showToast("You must be signed in to post.", "error");
      return;
    }

    // Light client-side checks for messages friendlier than the API's
    // structured field errors. The server validates again either way.
    const leaf = draft.categoryPath[draft.categoryPath.length - 1];
    if (!String(draft.title || "").trim()) {
      showToast("Add a title for your listing.", "error");
      return;
    }
    if (!draft.imageUrl) {
      showToast("Add a product photo using Select Files.", "error");
      return;
    }
    if (!leaf || !isCategoryLeaf(leaf)) {
      showToast(
        "Pick a category all the way to the deepest level.",
        "error",
      );
      return;
    }
    if (isOthersCategoryPath(draft.categoryPath)) {
      if (!String(draft.categoryNote || "").trim()) {
        showToast("Add a note describing your item.", "error");
        return;
      }
    }
    const areaLeaf = draft.locationPath[draft.locationPath.length - 1];
    if (!areaLeaf || areaLeaf.level !== 2) {
      showToast("Select division, city, and area for pickup.", "error");
      return;
    }
    if (draft.pickupLatitude == null || draft.pickupLongitude == null) {
      showToast("Confirm pickup location on the map.", "error");
      return;
    }
    if (!String(draft.story || "").trim()) {
      showToast("Add a short story or description.", "error");
      return;
    }
    if (draft.listingType === "exchange") {
      const interestedLeaf =
        draft.interestedCategoryPath[draft.interestedCategoryPath.length - 1];
      if (!interestedLeaf || !isCategoryLeaf(interestedLeaf)) {
        showToast("Select an interested item category through the deepest level.", "error");
        return;
      }
      if (isOthersCategoryPath(draft.interestedCategoryPath)) {
        if (!String(draft.interestedCategoryNote || "").trim()) {
          showToast("Add a note describing the item you want.", "error");
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const listing = await createListing(buildPayload(draft));
      showToast(`“${listing.title}” is live in the catalog.`, "success");
      resetDraft();
      // Tell the catalog to re-fetch so the new listing shows up on browse
      // / profile pages.
      refreshListings?.();
      navigate(`/products/${listing.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "LISTING_LIMIT_REACHED") {
          // Plan listing cap hit — send the user to membership to upgrade.
          showToast(
            `${err.message} Redirecting you to membership plans…`,
            "error",
          );
          navigate("/membership");
          return;
        }
        // Prefer the first field-level error message when present — it's
        // more actionable than the top-level "Please fix the highlighted
        // fields" wrapper.
        const firstFieldMsg = err.fieldErrors
          ? Object.values(err.fieldErrors)[0]
          : null;
        showToast(firstFieldMsg ?? err.message, "error");
      } else {
        showToast("Could not post the listing. Try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="flex flex-col md:flex-row items-center justify-between gap-6 bg-primary-container/10 p-8 rounded-2xl border border-primary/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
          <MaterialIcon name="eco" />
        </div>
        <div>
          <p className="font-bold text-on-surface font-headline">Impact Estimate</p>
          <p className="text-sm text-emerald-700 font-medium">
            Each reuse keeps good items in circulation
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full md:w-auto">
        <button
          type="button"
          disabled={submitting}
          onClick={() => showToast("Draft kept in this form until you post or leave.", "info")}
          className="px-8 py-4 text-zinc-600 font-bold hover:text-zinc-900 transition-colors disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={handlePost}
          disabled={submitting}
          className="flex-1 md:flex-none px-12 py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
        >
          {submitting ? "Posting…" : "Post Listing"}
        </button>
      </div>
    </footer>
  );
}
