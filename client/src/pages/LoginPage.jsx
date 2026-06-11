import AuthHeroPanel from "../components/auth/AuthHeroPanel.jsx";
import { AuthHomeLinkMobile } from "../components/auth/AuthHomeLink.jsx";
import LoginFormPanel from "../components/auth/LoginFormPanel.jsx";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-background text-on-background font-body antialiased">
      <AuthHomeLinkMobile />
      <div className="min-h-0 flex-1">
        <AuthHeroPanel />
        <main className="flex min-h-screen w-full min-w-0 flex-col bg-surface-bright relative z-10 md:ml-[41.666667%] md:w-[58.333333%] lg:ml-1/2 lg:w-1/2">
          <div className="flex flex-1 flex-col justify-center items-center p-6 md:p-12 lg:p-24 pt-20 md:pt-12 min-h-0">
            <LoginFormPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
