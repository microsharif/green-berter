import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { paragraphKey, PolicyRichText } from "./PolicyRichText.jsx";
import { PRIVACY_POLICY_SECTIONS } from "./privacyPolicyContent.js";

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

function ProseSection({ icon, title, paragraphs }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-6 md:p-8 editorial-shadow ring-1 ring-black/[0.03]">
      <SectionHeading icon={icon} title={title} />
      <div className="mt-5 space-y-4">
        {paragraphs.map((paragraph) => (
          <PolicyRichText key={paragraphKey(paragraph)} parts={paragraph} />
        ))}
      </div>
    </div>
  );
}

export default function PrivacyPolicySections() {
  return (
    <section className="asymmetric-layout pb-8">
      <div className="w-full space-y-6 md:space-y-8">
        {PRIVACY_POLICY_SECTIONS.map((section, index) => (
          <RevealOnScroll key={section.id} delay={index * 60}>
            <div id={section.id} className="scroll-mt-36">
              <ProseSection
                icon={section.icon}
                title={section.title}
                paragraphs={section.paragraphs}
              />
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
