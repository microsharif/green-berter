import { Link } from "react-router-dom";
import { useState } from "react";
import MaterialIcon from "../ui/MaterialIcon.jsx";

const NAV_PILLS = [
  { id: "general", label: "General", icon: "help_outline" },
  { id: "donation", label: "Give & Take", icon: "volunteer_activism" },
  { id: "exchange", label: "Exchange", icon: "swap_horiz" },
  { id: "safety", label: "Safety", icon: "shield" },
  { id: "support", label: "Support", icon: "support_agent" },
];

function scrollToSection(id) {
  const el = document.getElementById(`faq-${id}`);
  if (!el) return;
  const offset = 80; // account for sticky header
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function FaqHero() {
  const [activeId, setActiveId] = useState(null);
  return (
    <section className="relative overflow-hidden mb-0">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #a3f69c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #88d982 0%, transparent 40%)",
        }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/10" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full border border-white/10" />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full border border-white/5" />

      <div className="relative asymmetric-layout py-20 md:py-28">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed mb-5">
            <MaterialIcon name="help_outline" className="text-sm" />
            Help &amp; Support
          </p>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.05]">
            Got a{" "}
            <span className="relative inline-block">
              <span className="relative z-10 italic text-primary-fixed">
                Question?
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 bg-primary-fixed/40 rounded-full" />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed font-body mb-10">
            Answers about swapping, giving, account setup, safety, and getting
            support on Green Barter — all in one place.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
          >
            <MaterialIcon name="mail_outline" className="text-base" />
            Still need help? Contact us
          </Link>
        </div>
      </div>

      {/* Category nav pills */}
      <div className="relative bg-white/5 border-t border-white/10 backdrop-blur-sm">
        <div className="asymmetric-layout py-0">
          <nav
            className="flex gap-1 overflow-x-auto scrollbar-none py-3"
            aria-label="FAQ categories"
          >
            {NAV_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setActiveId(pill.id);
                  scrollToSection(pill.id);
                }}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                  activeId === pill.id
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/15"
                }`}
              >
                <MaterialIcon name={pill.icon} className="text-sm" />
                {pill.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
