import RevealOnScroll from "../ui/RevealOnScroll.jsx";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import { PolicyRichInline, PolicyRichText } from "../legal/PolicyRichText.jsx";
import { ABOUT_US_LEADERSHIP, ABOUT_US_SECTIONS } from "./aboutUsContent.js";

function bulletKey(item, index) {
  if (typeof item === "string") return item.slice(0, 40) || index;
  return item.map((part) => part.text).join("").slice(0, 40) || index;
}

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
          <PolicyRichText key={paragraph.slice(0, 48)} parts={paragraph} />
        ))}
      </div>
    </div>
  );
}

function FeatureSection({ icon, title, bullets }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-6 md:p-8 editorial-shadow ring-1 ring-black/[0.03]">
      <SectionHeading icon={icon} title={title} />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {bullets.map((item, index) => (
          <div
            key={bulletKey(item, index)}
            className="group rounded-2xl bg-surface-container-low/60 p-5 transition-colors hover:bg-primary-fixed/15"
          >
            <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MaterialIcon name="check" className="text-xl" aria-hidden />
            </span>
            <p className="text-base text-on-surface-variant leading-relaxed">
              <PolicyRichInline parts={item} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadershipProfile({ name, role, image, quote, reverse = false }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface-container-lowest editorial-shadow ring-1 ring-black/[0.03]">
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-12 md:gap-10 md:p-9">
        <div
          className={`md:col-span-4 lg:col-span-3 ${
            reverse ? "md:order-last" : ""
          }`}
        >
          <div className="relative">
            <div
              className="absolute -inset-2 rounded-[1.75rem] bg-gradient-to-br from-primary-fixed/40 to-primary/10 blur-md"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/40">
              <img
                src={image}
                alt={name}
                className="aspect-square h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <div className="mt-5 text-center md:text-left">
            <p className="font-headline text-lg font-bold text-on-surface">
              {name}
            </p>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {role}
            </p>
          </div>
        </div>
        <div className="relative md:col-span-8 lg:col-span-9">
          <MaterialIcon
            name="format_quote"
            className="absolute -top-2 -left-1 text-5xl text-primary-fixed/40 select-none"
            aria-hidden
          />
          <div className="relative space-y-4 pt-6 md:pt-8">
            {quote.map((paragraph) => (
              <PolicyRichText
                key={paragraph.slice(0, 48)}
                parts={paragraph}
                className="italic"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutUsSections() {
  return (
    <section className="asymmetric-layout pb-8">
      <div className="w-full space-y-6 md:space-y-8">
        {ABOUT_US_SECTIONS.map((section, index) => (
          <RevealOnScroll key={section.id} delay={index * 60}>
            <div id={section.id} className="scroll-mt-36">
              {section.bullets ? (
                <FeatureSection
                  icon={section.icon}
                  title={section.title}
                  bullets={section.bullets}
                />
              ) : (
                <ProseSection
                  icon={section.icon}
                  title={section.title}
                  paragraphs={section.paragraphs}
                />
              )}
            </div>
          </RevealOnScroll>
        ))}

        <RevealOnScroll delay={ABOUT_US_SECTIONS.length * 60}>
          <div className="pt-6 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-2">
              The People Behind Green Barter
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
              Leadership
            </h2>
          </div>
        </RevealOnScroll>

        {ABOUT_US_LEADERSHIP.map((leader, index) => (
          <RevealOnScroll
            key={leader.id}
            delay={(ABOUT_US_SECTIONS.length + index + 1) * 60}
          >
            <LeadershipProfile
              name={leader.name}
              role={leader.role}
              image={leader.image}
              quote={leader.quote}
              reverse={index % 2 === 1}
            />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
