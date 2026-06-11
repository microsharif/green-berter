import { Link } from "react-router-dom";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

const CATEGORIES = [
  { emoji: "👗", name: "Clothing & Accessories", tag: "Trending ↑" },
  { emoji: "🔧", name: "Tools & Equipment", tag: "Popular" },
  { emoji: "💼", name: "Services & Skills", tag: "New listings" },
  { emoji: "🏡", name: "Home & Garden", tag: "Active" },
  { emoji: "📱", name: "Electronics & Gadgets", tag: "High demand" },
];

export default function HomeFeaturedCategories() {
  return (
    <RevealOnScroll as="section" className="px-6 py-20 bg-white">
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center mb-12 flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-4">
            🗂️ Explore
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface mb-3">
            Featured Categories
          </h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            From clothing to electronics — find or list anything in our wide-ranging
            categories.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CATEGORIES.map((category, index) => (
            <RevealOnScroll key={category.name} delay={index * 60}>
              <Link
                to="/products"
                className="block rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 hover:border-primary/30 hover:shadow-md transition-all group h-full text-center sm:text-left flex flex-col items-center sm:items-stretch"
              >
                <span className="text-2xl mb-3 block" aria-hidden>
                  {category.emoji}
                </span>
                <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
                  {category.name}
                </h3>
                <p className="text-xs font-semibold text-primary mt-2">{category.tag}</p>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
