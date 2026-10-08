import HomeAnnouncementBanner from "../components/home/HomeAnnouncementBanner.jsx";
import HomeHero from "../components/home/HomeHero.jsx";
import HomeFeatureGrid from "../components/home/HomeFeatureGrid.jsx";
import HomeFeaturedCategories from "../components/home/HomeFeaturedCategories.jsx";
import HomeFeaturedProducts from "../components/home/HomeFeaturedProducts.jsx";
import HomeTestimonial from "../components/home/HomeTestimonial.jsx";

export default function HomePage() {
  return (
    <main className="bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      <div className="flex flex-col md:min-h-[calc(100dvh-6rem)] md:h-[calc(100dvh-6rem)]">
        <HomeAnnouncementBanner />
        <HomeHero />
      </div>
      <HomeFeatureGrid />
      <HomeFeaturedCategories />
      <HomeFeaturedProducts />
      <HomeTestimonial />
    </main>
  );
}
