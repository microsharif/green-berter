import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import { LegalSectionCard } from "../legal/LegalSectionCard.jsx";
import { FaqAccordionGroup } from "./FaqAccordion.jsx";
import { FAQ_SECTIONS } from "./faqContent.js";

export default function FaqSections() {
  return (
    <section className="asymmetric-layout pb-8">
      <div className="w-full space-y-8 md:space-y-10">
        {FAQ_SECTIONS.map((section, index) => (
          <RevealOnScroll key={section.id} delay={index * 60}>
            <LegalSectionCard id={section.id} title={section.title}>
              <FaqAccordionGroup items={section.items} />
            </LegalSectionCard>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
