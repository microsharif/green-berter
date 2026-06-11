import { ABOUT_US_HERO_IMAGE } from "./aboutUsContent.js";

export default function AboutUsHero() {
  return (
    <section className="asymmetric-layout mb-16 md:mb-20">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="max-w-4xl lg:col-span-8">
          <p className="hero-enter text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">
            Green Barter
          </p>
          <h1 className="hero-enter font-headline text-5xl md:text-6xl font-extrabold tracking-tight text-on-surface mb-6">
            About <span className="text-primary italic">Us</span>
          </h1>
          <p className="hero-enter hero-enter-delay-1 text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed">
            Empowering communities through sustainable swapping, giving, and a
            culture of sharing and reuse.
          </p>
        </div>
        <div className="hero-enter hero-enter-delay-1 lg:col-span-4">
          <div className="ml-auto max-w-xs overflow-hidden rounded-2xl bg-surface-container-lowest/90 p-6 editorial-shadow ring-1 ring-primary/10">
            <img
              src={ABOUT_US_HERO_IMAGE}
              alt="Green Barter logo"
              className="h-auto w-full object-contain"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
