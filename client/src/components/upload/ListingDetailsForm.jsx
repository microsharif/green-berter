import { useUploadDraft } from "../../context/UploadDraftContext.jsx";
import { CategoryCascade } from "./CategoryFields.jsx";
import { LocationCascade } from "./LocationFields.jsx";
import PickupLocationMap from "./PickupLocationMap.jsx";
import PhotoUploadDropzone from "./PhotoUploadDropzone.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function ListingDetailsForm() {
  const {
    draft,
    updateDraft,
    selectCategoryAtDepth,
    selectInterestedCategoryAtDepth,
    selectLocationAtDepth,
    setPickupCoordinates,
  } = useUploadDraft();
  const isExchange = draft.listingType === "exchange";
  const areaLeaf = draft.locationPath[draft.locationPath.length - 1];
  const areaSelected = areaLeaf?.level === 2;

  return (
    <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm space-y-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold font-headline mb-2 text-on-surface">
            Item Title
          </label>
          <input
            className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20"
            placeholder="e.g. Vintage Wooden Garden Tools"
            type="text"
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {draft.listingType === "exchange" ? "Exchange" : "Give"} categories
          </p>
          <CategoryCascade
            listingType={draft.listingType}
            categoryPath={draft.categoryPath}
            onSelectAtDepth={selectCategoryAtDepth}
            othersNote={draft.categoryNote}
            onOthersNoteChange={(value) => updateDraft({ categoryNote: value })}
          />
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Pickup location
          </p>
          <LocationCascade
            locationPath={draft.locationPath}
            onSelectAtDepth={selectLocationAtDepth}
          />
          {areaSelected ? (
            <PickupLocationMap
              latitude={draft.pickupLatitude}
              longitude={draft.pickupLongitude}
              onCoordinatesChange={setPickupCoordinates}
            />
          ) : null}
          <div>
            <label className="block text-sm font-bold font-headline mb-2 text-on-surface">
              Pickup notes <span className="font-normal text-on-surface-variant">(optional)</span>
            </label>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. near Gulshan 2 circle, gate 3"
              type="text"
              value={draft.pickupNotes}
              onChange={(e) => updateDraft({ pickupNotes: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold font-headline mb-2 text-on-surface">
            Story &amp; Description
          </label>
          <textarea
            className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20"
            placeholder="Tell the community about this item's history, condition, and why you're passing it on..."
            rows={4}
            value={draft.story}
            onChange={(e) => updateDraft({ story: e.target.value })}
          />
        </div>

        <PhotoUploadDropzone />
      </div>

      {isExchange ? (
        <div className="pt-8 border-t border-outline-variant/20 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <MaterialIcon name="info" className="text-secondary" />
            <span className="text-sm font-bold text-secondary uppercase tracking-wider">
              Exchange Details
            </span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold font-headline mb-2 text-on-surface">
                Estimated Price (BDT)
              </label>
              <input
                className="w-full bg-surface-container-low border-none rounded-lg p-4 text-on-surface focus:ring-2 focus:ring-secondary/20"
                placeholder="25.00"
                type="number"
                value={draft.referencePrice}
                onChange={(e) => updateDraft({ referencePrice: e.target.value })}
              />
              <p className="text-[10px] text-zinc-400 mt-2">
                Helps calibrate trade value without using cash.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold font-headline text-on-surface">
                Interested Item
              </label>
              <p className="text-xs text-on-surface-variant">
                Which exchange category are you hoping to receive?
              </p>
              <CategoryCascade
                listingType="exchange"
                categoryPath={draft.interestedCategoryPath}
                onSelectAtDepth={selectInterestedCategoryAtDepth}
                idPrefix="interested-category"
                othersNote={draft.interestedCategoryNote}
                onOthersNoteChange={(value) =>
                  updateDraft({ interestedCategoryNote: value })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
