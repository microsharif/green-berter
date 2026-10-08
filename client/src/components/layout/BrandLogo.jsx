import { Link, useLocation } from "react-router-dom";

const ICON_SRC = "/images/fav.png";

// Colors sampled directly from the icon mark:
//   #3bb934 — the vibrant green (lower hand)  → "Green"
//   #6cc4a2 — the sea-green (upper leaf)       → "Barter"
const BRAND_GREEN = "#3bb934";
const BRAND_SEA = "#6cc4a2";

const VARIANT_STYLES = {
  header: {
    icon: "h-12 w-auto sm:h-[3.25rem] md:h-14",
    brand: "text-[1.1rem] sm:text-[1.3rem] md:text-[1.5rem]",
    tagline: "text-[0.44rem] sm:text-[0.5rem] md:text-[0.55rem] text-[#1d561a]",
    iconTone: "",
  },
  footer: {
    icon: "h-12 w-auto sm:h-[3.25rem] md:h-14 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
    brand: "text-[1.1rem] sm:text-[1.3rem] md:text-[1.5rem]",
    tagline: "text-[0.44rem] sm:text-[0.5rem] md:text-[0.55rem] text-[#9edc9b]",
    iconTone: "drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
  },
};

export default function BrandLogo({ className = "", variant = "header" }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.header;

  function handleClick(event) {
    if (!isHome) return;

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Link
      to="/"
      onClick={handleClick}
      className={`inline-flex shrink-0 items-center gap-1.5 sm:gap-2 ${className}`}
      aria-label="Green Barter — Swap your goods and sustain our planet"
    >
      <img
        src={ICON_SRC}
        alt=""
        width={271}
        height={302}
        decoding="async"
        className={`block w-auto shrink-0 object-contain ${styles.icon} ${styles.iconTone}`}
      />
      <span className="flex flex-col">
        <span
          className={`font-poppins font-extrabold uppercase leading-none tracking-[0.05em] ${styles.brand}`}
        >
          <span style={{ color: BRAND_GREEN }}>Green</span>
          <span className="ml-[0.3em]" style={{ color: BRAND_SEA }}>
            Barter
          </span>
        </span>
        <span
          className={`mt-1 block w-full font-poppins font-bold uppercase leading-none tracking-[0.055em] ${styles.tagline}`}
        >
          Swap your goods &amp; sustain our planet
        </span>
      </span>
    </Link>
  );
}
