import FaqHero from "../components/faq/FaqHero.jsx";
import FaqSections from "../components/faq/FaqSections.jsx";

export default function FaqPage() {
  return (
    <main className="pb-20 bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <FaqHero />
      <FaqSections />
    </main>
  );
}
