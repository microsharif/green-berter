import { useState } from "react";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import OwnerPortfolioModal from "./OwnerPortfolioModal.jsx";

export default function ProductSellerCard({ seller }) {
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  if (!seller) return null;

  return (
    <section id="about-seller" className="scroll-mt-28 space-y-4">
      <h2 className="detail-section-heading font-headline text-xl font-bold text-on-surface md:text-2xl">
        About the owner
      </h2>
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface-container-high sm:h-[4.5rem] sm:w-[4.5rem]">
            <img
              className="h-full w-full object-cover"
              alt={seller.name}
              src={seller.avatar}
            />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-headline text-lg font-bold text-on-surface sm:text-xl">
                {seller.name}
              </h3>
              {seller.verified ? (
                <MaterialIcon
                  name="verified"
                  className="shrink-0 text-lg text-primary"
                  filled
                />
              ) : null}
            </div>
            <p className="text-sm text-on-surface-variant">{seller.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPortfolioOpen(true)}
          className="shrink-0 rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low sm:px-6"
        >
          View Owner Profile
        </button>
      </div>

      <OwnerPortfolioModal
        open={portfolioOpen}
        onClose={() => setPortfolioOpen(false)}
        seller={seller}
      />
    </section>
  );
}
