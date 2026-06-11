import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { PolicyRichText } from "../legal/PolicyRichText.jsx";
import { ABOUT_US_AT_A_GLANCE } from "./aboutUsContent.js";

function GlanceCard({ icon, label, children, highlight = false }) {
  return (
    <div
      className={`rounded-3xl p-7 md:p-8 editorial-shadow ${
        highlight
          ? "bg-gradient-to-br from-primary to-primary-container text-on-primary"
          : "bg-surface-container-lowest ring-1 ring-black/[0.03]"
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
            highlight ? "bg-white/20 text-on-primary" : "bg-primary-fixed/30 text-primary"
          }`}
        >
          <MaterialIcon name={icon} className="text-2xl" aria-hidden />
        </span>
        <h3
          className={`font-headline text-lg md:text-xl font-bold ${
            highlight ? "text-on-primary" : "text-on-surface"
          }`}
        >
          {label}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function AboutUsAtAGlance() {
  return (
    <section className="asymmetric-layout mb-16 md:mb-20">
      <RevealOnScroll>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlanceCard icon="track_changes" label="Our Mission" highlight>
            <p className="text-lg leading-relaxed italic text-on-primary/95">
              “{ABOUT_US_AT_A_GLANCE.mission}”
            </p>
          </GlanceCard>
          <GlanceCard icon="visibility" label="Our Vision">
            {ABOUT_US_AT_A_GLANCE.vision.map((paragraph) => (
              <PolicyRichText
                key={paragraph.slice(0, 48)}
                parts={`“${paragraph}”`}
                className="italic"
              />
            ))}
          </GlanceCard>
        </div>
      </RevealOnScroll>
    </section>
  );
}
