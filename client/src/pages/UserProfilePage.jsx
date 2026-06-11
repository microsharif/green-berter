import ProfileTopNav from "../components/profile/ProfileTopNav.jsx";
import ProfileSideNav from "../components/profile/ProfileSideNav.jsx";
import ProfileHero from "../components/profile/ProfileHero.jsx";
import ProfileClaimsPanel from "../components/profile/ProfileClaimsPanel.jsx";
import ProfileListingsPanel from "../components/profile/ProfileListingsPanel.jsx";
import ProfileAccountInfoSection from "../components/profile/ProfileAccountInfoSection.jsx";
import ProfileSettingsSection from "../components/profile/ProfileSettingsSection.jsx";
import ProfileFooter from "../components/profile/ProfileFooter.jsx";
import ProfileMobileDock from "../components/profile/ProfileMobileDock.jsx";
import { ProfilePageProvider } from "../context/ProfilePageContext.jsx";

export default function UserProfilePage() {
  return (
    <ProfilePageProvider>
      <div className="text-on-background min-h-screen bg-[#fcf9f8]">
        <ProfileTopNav />
        <ProfileSideNav />
        <main className="md:ml-64 pt-24 px-6 pb-20">
          <div className="max-w-6xl mx-auto space-y-12">
            <ProfileHero />
            <ProfileListingsPanel />
            <ProfileClaimsPanel />
            <ProfileSettingsSection />
            <ProfileAccountInfoSection />
          </div>
        </main>
        <ProfileFooter />
        <ProfileMobileDock />
      </div>
    </ProfilePageProvider>
  );
}
