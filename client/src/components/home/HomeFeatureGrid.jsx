import { Link } from "react-router-dom";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";

const CARDS = [
  {
    emoji: "🎁",
    title: "Give Something Free",
    body: "Have items you no longer use? Donate them to someone who needs them. Clothes, books, furniture — anything is welcome!",
    cta: "Give Now",
    to: "/upload?mode=give",
    accent: "from-primary-fixed/35 to-surface-container-lowest",
  },
  {
    emoji: "🤲",
    title: "Take for Free",
    body: "Looking for something? Browse free items shared by your community. Everything is completely free — no strings attached.",
    cta: "Browse Free Items",
    to: "/products",
    accent: "from-secondary-fixed/50 to-surface-container-lowest",
  },
  {
    emoji: "🔄",
    title: "Swap & Barter",
    body: "Swap goods or barter services with a single click. Have something they want? They have something you need? Perfect match!",
    cta: "Start Swapping",
    to: "/upload?mode=exchange",
    accent: "from-tertiary-fixed/40 to-surface-container-lowest",
  },
];

export default function HomeFeatureGrid() {
  return (
    <RevealOnScroll as="section" className="px-6 py-20 bg-[#f9faf5]">
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center mb-12 flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-4">
            🌊 Get Involved
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface mb-3">
            Give, Take &amp; Swap
          </h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            Three simple ways to participate in the Green Barter community.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map((card, index) => (
            <RevealOnScroll key={card.title} delay={index * 80}>
              <div
                className={`h-full rounded-3xl bg-gradient-to-br ${card.accent} border border-outline-variant/20 p-8 shadow-sm text-center md:text-left flex flex-col items-center md:items-stretch`}
              >
                <span className="text-4xl mb-5 block" aria-hidden>
                  {card.emoji}
                </span>
                <h3 className="text-xl font-bold text-on-surface mb-3">{card.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                  {card.body}
                </p>
                <Link
                  to={card.to}
                  className="inline-flex items-center justify-center rounded-full bg-primary text-on-primary text-sm font-bold px-5 py-2.5 hover:bg-primary-container transition-colors"
                >
                  {card.cta}
                </Link>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
