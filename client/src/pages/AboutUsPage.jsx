import AboutUsAtAGlance from "../components/about/AboutUsAtAGlance.jsx";
import AboutUsHero from "../components/about/AboutUsHero.jsx";
import AboutUsSections from "../components/about/AboutUsSections.jsx";

export default function AboutUsPage() {
  return (
    <main className="pt-10 pb-20 bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <AboutUsHero />
      <AboutUsAtAGlance />
      <AboutUsSections />
    </main>
  );
}
