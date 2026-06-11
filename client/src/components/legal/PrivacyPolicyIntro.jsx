import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import { paragraphKey, PolicyRichText } from "./PolicyRichText.jsx";
import {
  PRIVACY_POLICY_ILLUSTRATION,
  PRIVACY_POLICY_INTRO,
} from "./privacyPolicyContent.js";

export default function PrivacyPolicyIntro() {
  return (
    <section className="relative mb-16 md:mb-24 w-full overflow-hidden bg-gradient-to-br from-primary-fixed/20 via-surface-container-low to-primary-fixed/10">
      <div
        className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-primary-fixed/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/3 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-secondary-container/15 blur-2xl"
        aria-hidden="true"
      />

      <div className="asymmetric-layout relative py-12 md:py-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <RevealOnScroll className="lg:col-span-7 space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Overview
            </p>
            {PRIVACY_POLICY_INTRO.map((paragraph) => (
              <PolicyRichText key={paragraphKey(paragraph)} parts={paragraph} />
            ))}
          </RevealOnScroll>

          <RevealOnScroll className="lg:col-span-5" delay={120}>
            <div className="overflow-hidden rounded-2xl bg-surface-container-lowest/90 p-2 editorial-shadow ring-1 ring-primary/10">
              <img
                src={PRIVACY_POLICY_ILLUSTRATION}
                alt="Two people reviewing and signing a policy document"
                className="h-auto w-full rounded-xl object-cover"
                loading="lazy"
              />
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
