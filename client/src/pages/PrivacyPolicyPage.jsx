import PrivacyPolicyHero from "../components/legal/PrivacyPolicyHero.jsx";
import PrivacyPolicyIntro from "../components/legal/PrivacyPolicyIntro.jsx";
import PrivacyPolicySections from "../components/legal/PrivacyPolicySections.jsx";

export default function PrivacyPolicyPage() {
  return (
    <main className="pt-10 pb-20 bg-surface font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <PrivacyPolicyHero />
      <PrivacyPolicyIntro />
      <PrivacyPolicySections />
    </main>
  );
}
