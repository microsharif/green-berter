import { Link } from "react-router-dom";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

const STEPS = [
  {
    n: "1",
    emoji: "🔍",
    iconBg: "bg-amber-50",
    title: "Browse & Connect",
    body: "Explore thousands of listings from your community. Filter by category, location, or type. Message other members directly.",
    link: { to: "/products", label: "Explore Listings →" },
  },
  {
    n: "2",
    emoji: "📦",
    iconBg: "bg-secondary-fixed/50",
    title: "List Your Items or Skills",
    body: "Upload photos, write a description, and choose whether you want to give, swap, or receive something in exchange.",
    link: { to: "/upload?mode=give", label: "Post an Ad →" },
  },
  {
    n: "3",
    emoji: "🎉",
    iconBg: "bg-primary-fixed/45",
    title: "Swap & Celebrate",
    body: "Arrange a meetup or drop-off, complete the swap, and share your story with the community. Every barter is a win!",
    link: { to: "/products", label: "See Success Stories →" },
  },
];

export default function HomeHowItWorks() {
  return (
    <RevealOnScroll
      as="section"
      id="how-it-works"
      className="px-6 py-20 md:py-24 bg-background scroll-mt-24"
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed/40 border border-primary/10 px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-primary mb-5">
            ✨ Simple Process
          </span>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold text-primary mb-4">
            How It Works
          </h2>
          <p className="text-on-surface-variant text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Get started in minutes. No money involved — just community, trust, and
            swapping.
          </p>
          <div className="w-14 h-1 bg-primary rounded-full mx-auto mt-6" />
        </div>

        <div className="relative">
          <div
            className="hidden md:block absolute top-5 left-[12%] right-[12%] h-px bg-primary/25 z-0"
            aria-hidden
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 lg:gap-8">
            {STEPS.map((step, index) => (
              <RevealOnScroll key={step.n} delay={index * 90} className="relative z-10">
                <article className="relative rounded-2xl border border-outline-variant/30 bg-surface-container-low px-6 sm:px-8 pb-8 pt-12 text-center shadow-sm">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-base font-black shadow-md ring-4 ring-background">
                    {step.n}
                  </div>

                  <div
                    className={`mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${step.iconBg}`}
                    aria-hidden
                  >
                    {step.emoji}
                  </div>

                  <h3 className="font-headline text-xl font-bold text-primary mb-4 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm md:text-[15px] text-on-surface-variant leading-relaxed mb-6">
                    {step.body}
                  </p>
                  <Link
                    to={step.link.to}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {step.link.label}
                  </Link>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
