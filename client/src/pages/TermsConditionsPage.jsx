import TermsConditionsBody from "../components/legal/TermsConditionsBody.jsx";
import TermsConditionsHero from "../components/legal/TermsConditionsHero.jsx";
import TermsConditionsIntro from "../components/legal/TermsConditionsIntro.jsx";

export default function TermsConditionsPage() {
  return (
    <main className="pt-10 pb-20 bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <TermsConditionsHero />
      <TermsConditionsIntro />
      <TermsConditionsBody />
    </main>
  );
}
