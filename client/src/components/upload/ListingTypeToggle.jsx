import { useUploadDraft } from "../../context/UploadDraftContext.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function ListingTypeToggle() {
  const { draft, setListingType } = useUploadDraft();

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-6">
      <button
        type="button"
        onClick={() => setListingType("give")}
        className={`relative cursor-pointer group text-left rounded-xl border-2 transition-all duration-300 p-4 sm:p-6 ${
          draft.listingType === "give"
            ? "border-primary bg-surface-container-lowest"
            : "border-transparent bg-surface-container-low"
        }`}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <MaterialIcon name="volunteer_activism" className="text-xl sm:text-2xl" />
          </div>
          {draft.listingType === "give" ? (
            <MaterialIcon name="check_circle" className="text-primary text-xl sm:text-2xl" filled />
          ) : null}
        </div>
        <h3 className="text-base sm:text-xl font-bold font-headline text-on-surface">Give</h3>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-snug">
          Offer this item for free to a neighbor in need. No strings attached.
        </p>
      </button>
      <button
        type="button"
        onClick={() => setListingType("exchange")}
        className={`relative cursor-pointer group text-left rounded-xl border-2 transition-all duration-300 p-4 sm:p-6 ${
          draft.listingType === "exchange"
            ? "border-secondary bg-surface-container-lowest"
            : "border-transparent bg-surface-container-low"
        }`}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
            <MaterialIcon name="sync_alt" className="text-xl sm:text-2xl" />
          </div>
          {draft.listingType === "exchange" ? (
            <MaterialIcon name="check_circle" className="text-secondary text-xl sm:text-2xl" filled />
          ) : null}
        </div>
        <h3 className="text-base sm:text-xl font-bold font-headline text-on-surface">
          Exchange
        </h3>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-snug">
          Trade this item for something else or circular credits.
        </p>
      </button>
    </section>
  );
}
