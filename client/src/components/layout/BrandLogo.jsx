import { Link, useLocation } from "react-router-dom";

const LOGO_SRC = "/images/green-barter-logo.png";

export default function BrandLogo({ className = "" }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  function handleClick(event) {
    if (!isHome) return;

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Link
      to="/"
      onClick={handleClick}
      className={`inline-flex shrink-0 items-center ${className}`}
      aria-label="Green Barter home"
    >
      <img
        src={LOGO_SRC}
        alt="Green Barter"
        className="w-auto max-w-[7rem] object-contain object-left"
      />
    </Link>
  );
}
