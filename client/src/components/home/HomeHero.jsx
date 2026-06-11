import { Link } from "react-router-dom";
import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function HomeHero() {
  return (
    <section
      className="relative flex min-h-0 flex-1 items-center overflow-x-clip bg-[linear-gradient(135deg,#e8f5e9_0%,#f0faf0_40%,#e0f2f1_100%)]"
      aria-label="Home hero"
    >
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,rgba(163,246,156,0.28),transparent_50%)]" />
      <div className="relative w-full min-w-0 max-w-screen-2xl mx-auto px-4 py-6 sm:px-6 md:py-8">
        <div className="editorial-asymmetry w-full min-w-0 max-w-4xl">
          <span className="hero-enter mb-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary-fixed/40 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-primary sm:justify-start sm:px-4 sm:py-2 sm:text-xs">
            <span aria-hidden>🌎</span>
            Sustainable Trading Platform
          </span>

          <div
            className="hero-enter mb-4 h-1 w-12 rounded-full bg-primary sm:mb-5 sm:w-14"
            aria-hidden="true"
          />

          <h1 className="hero-enter hero-enter-delay-1 hero-title mb-3 break-words sm:mb-4">
            Swap Goods.
            <br />
            <span className="highlight">Build Community.</span>
            <br />
            Sustain the Planet.
          </h1>

          <p className="hero-enter hero-enter-delay-2 mb-5 max-w-3xl break-words text-pretty text-[clamp(0.9375rem,1.45vw,1.2rem)] leading-snug text-on-surface-variant sm:mb-6">
            Welcome to Green Barter — a platform where sharing is caring. Give what
            you don&apos;t need, take what you do, and swap &amp; barter goods and
            skills with your neighbors sustainably.
          </p>

          <div className="hero-enter hero-enter-delay-3 flex flex-wrap gap-3 sm:gap-4">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary-container active:scale-[0.98] sm:px-8 sm:py-3.5 sm:text-base"
            >
              <MaterialIcon name="search" className="text-lg sm:text-xl" />
              Browse Listings
            </Link>
            <Link
              to="/upload?mode=give"
              className="inline-flex items-center gap-2 rounded-full border-2 border-outline-variant bg-surface-container-lowest px-6 py-3 text-sm font-bold text-on-surface transition-all duration-300 hover:scale-[1.02] hover:bg-surface-container-low active:scale-[0.98] sm:px-8 sm:py-3.5 sm:text-base"
            >
              + List Your Item
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
