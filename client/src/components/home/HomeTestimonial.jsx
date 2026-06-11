import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

export default function HomeTestimonial() {
  const { isAuthenticated } = useAuth();

  return (
    <RevealOnScroll as="section" className="px-6 py-20 md:py-24 bg-white">
      <div className="max-w-screen-2xl mx-auto rounded-[2rem] bg-[linear-gradient(135deg,#1b5e20_0%,#00897b_100%)] text-on-primary p-8 md:p-14 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
        <div className="relative text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            💚 Join Us
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold mb-4">
            A Growing Green Community
          </h2>
          <p className="text-on-primary/90 max-w-2xl mx-auto">
            Thousands of people are already swapping, sharing, and making a
            difference. Be part of the movement.
          </p>
        </div>
        <div className="relative flex flex-wrap justify-center gap-4">
          <Link
            to={isAuthenticated ? "/profile" : "/register"}
            className="inline-flex items-center gap-2 rounded-full bg-white text-primary font-bold px-6 py-3 hover:bg-primary-fixed transition-colors"
          >
            🌿 Join Free Today
          </Link>
          <Link
            to="/about-us"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 text-on-primary font-bold px-6 py-3 hover:bg-white/10 transition-colors"
          >
            Learn More About Us
          </Link>
        </div>
      </div>
    </RevealOnScroll>
  );
}
