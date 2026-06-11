import { Link } from "react-router-dom";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const className =
  "inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-on-surface shadow-sm border border-outline-variant/30 hover:bg-surface-container-low transition-colors dark:bg-zinc-900/90";

export function AuthHomeLinkMobile() {
  return (
    <Link
      to="/"
      className={`${className} fixed top-4 left-4 z-[100] md:hidden`}
    >
      <MaterialIcon name="arrow_back" className="text-lg" />
      Home
    </Link>
  );
}

export function AuthHomeLinkInHero() {
  return (
    <Link
      to="/"
      className={`${className} absolute top-4 left-4 z-30 hidden md:inline-flex lg:left-6`}
    >
      <MaterialIcon name="arrow_back" className="text-lg" />
      Home
    </Link>
  );
}
