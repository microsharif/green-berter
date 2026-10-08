import { Link } from "react-router-dom";
import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { FaqAccordionGroup, FaqAccordionItem } from "./FaqAccordion.jsx";
import { FAQ_SECTIONS } from "./faqContent.js";
import { useState } from "react";
import { PolicyRichText } from "../legal/PolicyRichText.jsx";

/* ─────────────────────────────────────────────
   Layout 1 — Two-column accordion grid (General)
   ─────────────────────────────────────────────*/
function TwoColumnSection({ section }) {
  const [openId, setOpenId] = useState(null);
  const half = Math.ceil(section.items.length / 2);
  const left = section.items.slice(0, half);
  const right = section.items.slice(half);

  return (
    <section id={`faq-${section.id}`} className="scroll-mt-20">
      <RevealOnScroll>
        <div className="asymmetric-layout py-16 md:py-20">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <MaterialIcon name="help_outline" className="text-lg" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                Getting Started
              </p>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface">
                {section.title}
              </h2>
            </div>
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {left.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openId === item.id}
                  onToggle={() =>
                    setOpenId((c) => (c === item.id ? null : item.id))
                  }
                />
              ))}
            </div>
            <div className="space-y-4">
              {right.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openId === item.id}
                  onToggle={() =>
                    setOpenId((c) => (c === item.id ? null : item.id))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Layout 2 — Sidebar + stacked list (Donation)
   ─────────────────────────────────────────────*/
function SidebarSection({ section, icon, accent, tagline }) {
  return (
    <section id={`faq-${section.id}`} className="scroll-mt-20 bg-surface-container-low/60">
      <RevealOnScroll>
        <div className="asymmetric-layout py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">
            {/* Sticky sidebar */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <MaterialIcon name={icon} className="text-2xl text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-1">
                {tagline}
              </p>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface mb-4 leading-snug">
                {section.title}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Everything you need to know about giving and receiving items on
                Green Barter.
              </p>
              <div className="mt-6 h-1 w-12 rounded-full bg-primary/30" />
            </div>

            {/* Accordion list */}
            <div>
              <FaqAccordionGroup items={section.items} />
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Layout 3 — Numbered feature cards (Exchange)
   ─────────────────────────────────────────────*/
function FeatureCardsSection({ section }) {
  const [openId, setOpenId] = useState(null);

  return (
    <section id={`faq-${section.id}`} className="scroll-mt-20">
      <RevealOnScroll>
        <div className="asymmetric-layout py-16 md:py-20">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <MaterialIcon name="swap_horiz" className="text-xl text-primary" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                  Swapping Goods
                </p>
                <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface">
                  {section.title}
                </h2>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed ml-1 mt-1">
              Learn how to list, find, and arrange item exchanges on the platform.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {section.items.map((item, idx) => {
              const isOpen = openId === item.id;
              return (
                <RevealOnScroll key={item.id} delay={idx * 80}>
                  <div
                    className={`rounded-2xl border-2 bg-surface-container-low transition-all duration-300 ${
                      isOpen
                        ? "border-primary/40 shadow-md shadow-primary/10"
                        : "border-outline-variant/50 hover:border-primary/25 hover:shadow-sm"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenId((c) => (c === item.id ? null : item.id))
                      }
                      className="w-full text-left p-5 flex items-start gap-4 group"
                    >
                      <span className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-headline font-extrabold text-sm group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-headline font-bold text-base text-on-surface leading-snug pr-2">
                          {item.question.replace(/^Q\d+:\s*/, "")}
                        </p>
                      </div>
                      <MaterialIcon
                        name="expand_more"
                        className={`flex-shrink-0 text-primary transition-transform duration-300 ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                        aria-hidden
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="px-5 pb-5 pt-4 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant/30">
                          <PolicyRichText parts={item.answer} />
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Layout 4 — Full-width callout (Safety)
   ─────────────────────────────────────────────*/
function CalloutSection({ section }) {
  const item = section.items[0];

  return (
    <section id={`faq-${section.id}`} className="scroll-mt-20 bg-primary/5">
      <RevealOnScroll>
        <div className="asymmetric-layout py-16 md:py-20">
          <div className="max-w-4xl">
            <div className="flex items-start gap-6 flex-col sm:flex-row">
              <div className="flex-shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <MaterialIcon name="shield" className="text-3xl text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-1">
                  Your Safety Matters
                </p>
                <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface mb-4">
                  {section.title}
                </h2>
                <div className="rounded-2xl border-2 border-primary/20 bg-white/70 backdrop-blur-sm p-6 shadow-sm">
                  <p className="font-headline font-bold text-lg text-on-surface mb-3">
                    {item.question.replace(/^Q\d+:\s*/, "")}
                  </p>
                  <div className="text-on-surface-variant leading-relaxed text-sm">
                    <PolicyRichText parts={item.answer} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant">
                  <MaterialIcon name="verified" className="text-primary text-base" />
                  Green Barter has a zero-tolerance policy for unsafe transactions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Layout 5 — Two-col grid + CTA (Support)
   ─────────────────────────────────────────────*/
function SupportSection({ section }) {
  const [openId, setOpenId] = useState(null);
  const half = Math.ceil(section.items.length / 2);
  const left = section.items.slice(0, half);
  const right = section.items.slice(half);

  return (
    <section id={`faq-${section.id}`} className="scroll-mt-20 bg-surface-container-low/60">
      <RevealOnScroll>
        <div className="asymmetric-layout py-16 md:py-20">
          {/* Header */}
          <div className="flex items-center gap-3 mb-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MaterialIcon name="support_agent" className="text-xl text-primary" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                We're Here For You
              </p>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface">
                {section.title}
              </h2>
            </div>
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div className="space-y-4">
              {left.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openId === item.id}
                  onToggle={() =>
                    setOpenId((c) => (c === item.id ? null : item.id))
                  }
                />
              ))}
            </div>
            <div className="space-y-4">
              {right.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openId === item.id}
                  onToggle={() =>
                    setOpenId((c) => (c === item.id ? null : item.id))
                  }
                />
              ))}
            </div>
          </div>

          {/* CTA banner */}
          <RevealOnScroll>
            <div className="rounded-3xl bg-gradient-to-r from-primary to-primary-container p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-fixed/70 mb-1">
                  Still Have Questions?
                </p>
                <h3 className="font-headline text-2xl font-extrabold text-white mb-1">
                  Our team is happy to help.
                </h3>
                <p className="text-white/70 text-sm">
                  Reach out via email at{" "}
                  <span className="text-primary-fixed font-semibold">
                    info@greenbarterint.com
                  </span>{" "}
                  or call{" "}
                  <span className="text-primary-fixed font-semibold">
                    +8809611526698
                  </span>
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold text-sm rounded-full shadow hover:shadow-md transition-all duration-200"
                >
                  <MaterialIcon name="mail_outline" className="text-base" />
                  Contact Us
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Root export — maps each section to a layout
   ─────────────────────────────────────────────*/
const LAYOUT_MAP = {
  general: (s) => <TwoColumnSection key={s.id} section={s} />,
  donation: (s) => (
    <SidebarSection
      key={s.id}
      section={s}
      icon="volunteer_activism"
      tagline="Give & Take"
    />
  ),
  exchange: (s) => <FeatureCardsSection key={s.id} section={s} />,
  safety: (s) => <CalloutSection key={s.id} section={s} />,
  support: (s) => <SupportSection key={s.id} section={s} />,
};

export default function FaqSections() {
  return (
    <div>
      {FAQ_SECTIONS.map((section) =>
        LAYOUT_MAP[section.id]
          ? LAYOUT_MAP[section.id](section)
          : (
            <section key={section.id} id={`faq-${section.id}`} className="scroll-mt-20">
              <div className="asymmetric-layout py-16">
                <FaqAccordionGroup items={section.items} />
              </div>
            </section>
          )
      )}
    </div>
  );
}
