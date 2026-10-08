import { Link } from "react-router-dom";
import { useCatalog } from "../../context/CatalogContext.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import HomeRecentListingsSlider from "./HomeRecentListingsSlider.jsx";

export default function HomeFeaturedProducts() {
  const { featuredProducts } = useCatalog();

  return (
    <RevealOnScroll as="section" className="px-6 py-20 bg-[#f9faf5]">
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center flex flex-col items-center">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            Recent Listing
          </h2>
          <HomeRecentListingsSlider products={featuredProducts} />
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
