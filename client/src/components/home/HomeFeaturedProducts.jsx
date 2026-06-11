import { Link } from "react-router-dom";
import { useCatalog } from "../../context/CatalogContext.jsx";
import ProductCardFeatured from "../products/ProductCardFeatured.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

export default function HomeFeaturedProducts() {
  const { featuredProducts } = useCatalog();

  return (
    <RevealOnScroll as="section" className="px-6 py-20 bg-[#f9faf5]">
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-4">
            🆕 Fresh Listings
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface mb-3">
            Recent Listings
          </h2>
          <p className="text-on-surface-variant">
            See what your community has just posted. Be the first to grab it!
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((p, index) => (
            <RevealOnScroll key={p.id} delay={index * 80}>
              <ProductCardFeatured product={p} />
            </RevealOnScroll>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
          >
            View All Listings <MaterialIcon name="arrow_forward" />
          </Link>
        </div>
      </div>
    </RevealOnScroll>
  );
}
