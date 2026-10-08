import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useUploadDraft } from "../context/UploadDraftContext.jsx";
import ListingTypeToggle from "../components/upload/ListingTypeToggle.jsx";
import ListingDetailsForm from "../components/upload/ListingDetailsForm.jsx";
import ListingSubmitBar from "../components/upload/ListingSubmitBar.jsx";
import RevealOnScroll from "../components/ui/RevealOnScroll.jsx";

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const { applyQueryMode } = useUploadDraft();

  useEffect(() => {
    applyQueryMode(searchParams.get("mode"));
  }, [searchParams, applyQueryMode]);

  return (
    <main className="pt-2 pb-20 px-6 max-w-4xl mx-auto bg-surface text-on-surface min-h-screen">
      <header className="mb-12">
        <h1 className="hero-enter text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-2">
          List an item
        </h1>
        <p className="hero-enter hero-enter-delay-1 text-zinc-500 font-medium Inter">
          Keep the circle moving. Choose how you want to share with the
          community.
        </p>
      </header>
      <div className="space-y-12">
        <RevealOnScroll delay={120}>
          <ListingTypeToggle />
        </RevealOnScroll>
        <RevealOnScroll delay={180}>
          <ListingDetailsForm />
        </RevealOnScroll>
        <RevealOnScroll delay={240}>
          <ListingSubmitBar />
        </RevealOnScroll>
      </div>
    </main>
  );
}
