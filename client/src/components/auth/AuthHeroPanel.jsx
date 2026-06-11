import { AuthHomeLinkInHero } from "./AuthHomeLink.jsx";

export default function AuthHeroPanel() {
  return (
    <section className="hidden md:flex fixed left-0 top-0 z-0 h-screen w-5/12 lg:w-1/2 overflow-hidden bg-primary-container items-center justify-center">
      <AuthHomeLinkInHero />
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
        <img
          className="w-full h-full object-cover"
          alt="Sunlit fern leaves in a lush forest with morning mist"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiStpmb-X51rCerqheblLaBAoXLxNsN43KBd04Jwekl1PH1qgq9HyNTvu_vs4jx2S2T2qqQFCgT7rMfTEOc-dLNwzxtVzPfFu7DPV64lNfA0qitNU7hQLoP0rYmt69s8hXh3DZXfmfpPJXn9jkbVxg3W3bX6xIQWhjFMgHVUtEnzd6-uam3f1-MrQvB1TWrrtUwg49vHOXewuDk29VjA_iqlZMrbZHAm93ARPqjESjuiJ_SZEkjOSCXQedO6rD1oyZ7fcqPOrM7AA6"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 to-transparent z-10" />
      <div className="relative z-20 px-12 lg:px-24 text-on-primary-container">
        <h1 className="font-display text-5xl lg:text-7xl font-extrabold tracking-tighter leading-none mb-8">
          Green Barter
          <br />
          Collective
        </h1>
        <p className="font-body text-lg lg:text-xl opacity-90 max-w-md leading-relaxed">
          Join a regenerative community where giving is effortless and circular
          living is our shared editorial vision.
        </p>
        <div className="mt-20 flex gap-4">
          {["eco", "recycling", "diversity_3"].map((icon) => (
            <div
              key={icon}
              className="w-12 h-12 rounded-full bg-on-primary-container/20 backdrop-blur-md flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-white">{icon}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-12 left-12 lg:left-24 z-20">
        <span className="font-label text-xs uppercase tracking-[0.3em] text-on-primary-container/60">
          Regenerating Since 2024
        </span>
      </div>
    </section>
  );
}
