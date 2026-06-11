import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { isOthersParentCategory } from "../utils/categoryOthers.js";

/**
 * In-memory draft for the upload page (Section 2 of the DFD).
 *
 * Key shape decisions:
 * - `imageUrl` stores the **server URL** returned by /upload/product-image,
 *   not a base64 data URL. The previous Data-URL approach was a localStorage
 *   workaround from before the upload API existed.
 * - `categoryPath` is the cascading-picker selection as an array of
 *   `{ id, name, level }` segments, deepest-first-leaf at the end. The
 *   server only needs the leaf's `categoryId`, but we keep the breadcrumb
 *   client-side so reopening a deeper level after re-selecting an earlier
 *   one is cheap.
 * - `story` matches the server field (was `description` in the old draft).
 *
 * The draft is intentionally **not** persisted to localStorage. The page
 * is auth-gated and the form is short; persisting half-filled state across
 * sessions creates more confusion than value.
 */
const initialDraft = {
  listingType: "give",
  title: "",
  categoryPath: [],
  locationPath: [],
  pickupLatitude: null,
  pickupLongitude: null,
  pickupNotes: "",
  story: "",
  referencePrice: "",
  interestedCategoryPath: [],
  categoryNote: "",
  interestedCategoryNote: "",
  imageUrl: "",
};

const UploadDraftContext = createContext(null);

export function UploadDraftProvider({ children }) {
  const [draft, setDraft] = useState(() => ({ ...initialDraft }));

  const updateDraft = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  /**
   * Toggling Give ↔ Exchange invalidates the category selection (different
   * tree) and the exchange-only fields. Image + title + location + story
   * survive so the user doesn't lose typing.
   */
  const setListingType = useCallback((listingType) => {
    setDraft((d) =>
      d.listingType === listingType
        ? d
        : {
            ...d,
            listingType,
            categoryPath: [],
            referencePrice: "",
            interestedCategoryPath: [],
            categoryNote: "",
            interestedCategoryNote: "",
          }
    );
  }, []);

  /**
   * Update one cascade slot (0-based depth).
   * - `selection` is the chosen category `{ id, name, level }` or null to clear.
   * - Selecting at depth N truncates anything previously selected at depth > N.
   */
  const selectCategoryAtDepth = useCallback((depth, selection) => {
    setDraft((d) => {
      const next = d.categoryPath.slice(0, depth);
      if (selection) next.push(selection);
      const keepNote = isOthersParentCategory(next[0]);
      return {
        ...d,
        categoryPath: next,
        categoryNote: keepNote ? d.categoryNote : "",
      };
    });
  }, []);

  const selectInterestedCategoryAtDepth = useCallback((depth, selection) => {
    setDraft((d) => {
      const next = d.interestedCategoryPath.slice(0, depth);
      if (selection) next.push(selection);
      const keepNote = isOthersParentCategory(next[0]);
      return {
        ...d,
        interestedCategoryPath: next,
        interestedCategoryNote: keepNote ? d.interestedCategoryNote : "",
      };
    });
  }, []);

  const selectLocationAtDepth = useCallback((depth, selection) => {
    setDraft((d) => {
      const next = d.locationPath.slice(0, depth);
      if (selection) next.push(selection);

      let pickupLatitude = d.pickupLatitude;
      let pickupLongitude = d.pickupLongitude;

      if (selection?.level === 2) {
        pickupLatitude = selection.latitude ?? null;
        pickupLongitude = selection.longitude ?? null;
      } else if (depth < d.locationPath.length || !selection) {
        pickupLatitude = null;
        pickupLongitude = null;
      }

      return {
        ...d,
        locationPath: next,
        pickupLatitude,
        pickupLongitude,
      };
    });
  }, []);

  const setPickupCoordinates = useCallback((latitude, longitude) => {
    setDraft((d) => ({
      ...d,
      pickupLatitude: latitude,
      pickupLongitude: longitude,
    }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft({ ...initialDraft });
  }, []);

  /** Sync listing type from URL ?mode= — default is Give when absent. */
  const applyQueryMode = useCallback(
    (mode) => {
      const next = mode === "exchange" ? "exchange" : "give";
      setListingType(next);
    },
    [setListingType]
  );

  const value = useMemo(
    () => ({
      draft,
      setListingType,
      updateDraft,
      selectCategoryAtDepth,
      selectInterestedCategoryAtDepth,
      selectLocationAtDepth,
      setPickupCoordinates,
      resetDraft,
      applyQueryMode,
    }),
    [
      draft,
      setListingType,
      updateDraft,
      selectCategoryAtDepth,
      selectInterestedCategoryAtDepth,
      selectLocationAtDepth,
      setPickupCoordinates,
      resetDraft,
      applyQueryMode,
    ]
  );

  return (
    <UploadDraftContext.Provider value={value}>
      {children}
    </UploadDraftContext.Provider>
  );
}

export function useUploadDraft() {
  const ctx = useContext(UploadDraftContext);
  if (!ctx) {
    throw new Error("useUploadDraft must be used within UploadDraftProvider");
  }
  return ctx;
}
