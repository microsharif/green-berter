import { useState } from "react";
import { isGive } from "../products/productUtils.js";
import { listingStatusLabel } from "./claimUtils.js";

const TABS = [
  { id: "details", label: "Item details" },
  { id: "description", label: "Description" },
];

export default function ProductDetailNarrative({ product }) {
  const [activeTab, setActiveTab] = useState("details");
  const give = isGive(product.listingType);
  const showStatus =
    product.status && product.status !== "available";

  const category =
    product.categoryName ??
    product.specs?.find((row) => row.label === "Category")?.value ??
    "—";
  const section =
    product.categoryPath ??
    product.specs?.find((row) => row.label === "Section")?.value ??
    null;

  return (
    <section className="space-y-4">
      <h2 className="detail-section-heading font-headline text-xl font-bold text-on-surface md:text-2xl">
        About this item
      </h2>
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div
          className="flex gap-1 border-b border-outline-variant bg-surface-container-low p-1.5"
          role="tablist"
          aria-label="About this item"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`about-item-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`about-item-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-6 ${
                activeTab === tab.id
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8">
          {activeTab === "description" ? (
            <div
              role="tabpanel"
              id="about-item-panel-description"
              aria-labelledby="about-item-tab-description"
            >
              <p className="leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                {product.narrative}
              </p>
            </div>
          ) : null}

          {activeTab === "details" ? (
            <div
              role="tabpanel"
              id="about-item-panel-details"
              aria-labelledby="about-item-tab-details"
              className="space-y-6"
            >
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-container-low p-4">
                <div className="text-center border-r border-outline-variant">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Condition
                  </p>
                  <p className="text-sm font-semibold text-on-surface">
                    {product.condition}
                  </p>
                </div>
                <div className="text-center border-r border-outline-variant">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Posted
                  </p>
                  <p className="text-sm font-semibold text-on-surface">
                    {product.postedAgo}
                  </p>
                </div>
                <div className="text-center">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    {showStatus ? "Status" : "Type"}
                  </p>
                  <p className="text-sm font-semibold text-on-surface">
                    {showStatus
                      ? listingStatusLabel(product.status)
                      : give
                        ? "Give"
                        : "Exchange"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 border-t border-outline-variant pt-6 md:grid-cols-2 md:gap-8">
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    Category
                  </span>
                  <span className="text-base text-on-surface">{category}</span>
                </div>
                {section ? (
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                      Section
                    </span>
                    <span className="text-base text-on-surface">{section}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
