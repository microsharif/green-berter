import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useProfilePage } from "../../context/ProfilePageContext.jsx";
import { fetchListings } from "../../api/listings.js";
import { apiListingToCatalogProduct } from "../../data/listingAdapter.js";
import ProductCardProfile from "../products/ProductCardProfile.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import AllListingsTableModal from "./AllListingsTableModal.jsx";
import EditListingModal from "./EditListingModal.jsx";

const TABS = [
  { id: "listings", label: "Active Listings" },
  { id: "history", label: "Swap History" },
];

const ACTIVE_LISTINGS_PREVIEW_LIMIT = 6;

/**
 * DFD §3 — Listings panel: reads product-listing rows for the current user
 * from the API (`GET /listings?ownerUserId=…`). No client-side catalog or
 * localStorage — database rows only.
 */
export default function ProfileListingsPanel() {
  const { activeSection, goToSection } = useProfilePage();
  const [activeTab, setActiveTab] = useState("listings");
  const { user } = useAuth();
  const { refreshListings } = useCatalog();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [allListingsModalOpen, setAllListingsModalOpen] = useState(false);

  const loadMyListings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { listings: rows } = await fetchListings({
        ownerUserId: user.id,
        limit: ACTIVE_LISTINGS_PREVIEW_LIMIT,
      });
      setListings(rows.map(apiListingToCatalogProduct).filter(Boolean));
    } catch (err) {
      setLoadError(err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadMyListings();
  }, [user?.id, loadMyListings]);

  function handleListingSaved() {
    loadMyListings();
    refreshListings?.();
  }

  useEffect(() => {
    if (
      activeSection === "listings" ||
      activeSection === "history" ||
      activeSection === "claims" ||
      activeSection === "account"
    ) {
      setActiveTab(activeSection);
    }
  }, [activeSection]);

  function handleTabClick(tabId) {
    setActiveTab(tabId);
    if (tabId === "listings" || tabId === "history") {
      goToSection(tabId);
    }
  }

  const showSeeAllButton =
    activeTab === "listings" && !loading && !loadError && listings.length > 0;

  return (
    <>
    <RevealOnScroll as="section" id="profile-listings" className="scroll-mt-24 space-y-8">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-200">
        <div className="flex gap-6 md:gap-12 overflow-x-auto min-w-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabClick(t.id)}
              className={`pb-4 whitespace-nowrap text-lg transition-colors ${
                activeTab === t.id
                  ? "text-green-900 border-b-2 border-green-800 font-bold"
                  : "text-zinc-400 hover:text-zinc-600 font-medium"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {showSeeAllButton ? (
          <button
            type="button"
            onClick={() => setAllListingsModalOpen(true)}
            className="pb-4 shrink-0 text-sm font-bold text-primary hover:underline whitespace-nowrap"
          >
            See All listing
          </button>
        ) : null}
      </div>
      {activeTab === "listings" ? (
        loading ? (
          <p className="text-on-surface-variant py-8">Loading your listings…</p>
        ) : loadError ? (
          <p className="text-on-surface-variant py-8">
            Could not load your listings. Please try again later.
          </p>
        ) : listings.length === 0 ? (
          <p className="text-on-surface-variant py-8">
            You haven&apos;t posted anything yet. Head to Give/Exchange to share
            your first item.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((p, index) => (
              <RevealOnScroll key={p.id} delay={index * 80}>
                <ProductCardProfile
                  product={p}
                  onEdit={setEditingProduct}
                />
              </RevealOnScroll>
            ))}
          </div>
        )
      ) : (
        <p className="text-on-surface-variant py-8">
          Swap history will appear here once you connect a backend.
        </p>
      )}

      <AllListingsTableModal
        open={allListingsModalOpen}
        onClose={() => setAllListingsModalOpen(false)}
        ownerUserId={user?.id}
        onSaved={handleListingSaved}
        onDeleted={handleListingSaved}
      />
    </RevealOnScroll>

    <EditListingModal
      open={Boolean(editingProduct)}
      product={editingProduct}
      onClose={() => setEditingProduct(null)}
      onSaved={handleListingSaved}
    />
  </>
  );
}
