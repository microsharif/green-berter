import ProductFiltersPanel from "./ProductFiltersPanel.jsx";

/** Desktop-only sticky filter sidebar (hidden on mobile). */
export default function ProductFiltersSidebar() {
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-28">
        <ProductFiltersPanel />
      </div>
    </aside>
  );
}
