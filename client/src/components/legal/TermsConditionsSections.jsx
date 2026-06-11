import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import {
  PolicyBulletList,
  PolicyRichText,
  paragraphKey,
} from "./PolicyRichText.jsx";
import { TERMS_CONDITIONS_SECTIONS } from "./termsConditionsContent.js";

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-4">
      {icon ? (
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed/30 text-primary">
          <MaterialIcon name={icon} className="text-2xl" aria-hidden />
        </span>
      ) : null}
      <h2 className="font-headline text-xl md:text-2xl font-bold text-on-surface">
        {title}
      </h2>
    </div>
  );
}

function EditorialSection({ section }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-6 md:p-8 editorial-shadow ring-1 ring-black/[0.03]">
      <SectionHeading icon={section.icon} title={section.title} />
      <div className="mt-5 space-y-4">
        {section.subtitle ? (
          <p className="text-base md:text-lg font-medium leading-relaxed text-on-surface-variant">
            {section.subtitle}
          </p>
        ) : null}

        {section.paragraphs?.map((paragraph) => (
          <PolicyRichText key={paragraphKey(paragraph)} parts={paragraph} />
        ))}

        {section.bullets ? <PolicyBulletList items={section.bullets} /> : null}

        {section.subsections?.map((subsection) => (
          <div
            key={subsection.id}
            id={subsection.id}
            className="scroll-mt-36 space-y-3 pt-2"
          >
            <h3 className="font-headline text-lg md:text-xl font-bold text-on-surface">
              {subsection.title}
            </h3>
            {subsection.bullets ? (
              <PolicyBulletList items={subsection.bullets} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TermsConditionsSections() {
  return (
    <section className="asymmetric-layout pb-8">
      <div className="w-full space-y-6 md:space-y-8">
        {TERMS_CONDITIONS_SECTIONS.map((section, index) => (
          <RevealOnScroll key={section.id} delay={index * 60}>
            <div id={section.id} className="scroll-mt-36">
              <EditorialSection section={section} />
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
