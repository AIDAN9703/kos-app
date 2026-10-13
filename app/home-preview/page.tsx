/**
 * MOCKUP (v2): a redesign of the landing page, for review only. It sits
 * outside the (root) group so it can use its own see-through nav.
 * Everything lives in this folder; delete app/home-preview to remove it.
 */
import type { Metadata } from "next";
import Footer from "@/shared/components/layouts/Footer";
import { getTestimonials } from "@/features/_marketing/landing/actions";
import { getFeaturedBoats } from "@/features/boats/boat.data";
import type { BoatCard } from "@/features/boats/boat.types";
import { PreviewNav } from "./_components/PreviewNav";
import { Hero } from "./_components/Hero";
import { Statement } from "./_components/Statement";
import { FleetReel } from "./_components/FleetReel";
import { Occasions } from "./_components/Occasions";
import { Postcards } from "./_components/Postcards";
import { Guestbook } from "./_components/Guestbook";
import { BrandBand } from "./_components/BrandBand";
import { Questions } from "./_components/Questions";
import { PlanSentence } from "./_components/PlanSentence";

export const metadata: Metadata = {
  title: "Home preview",
  robots: { index: false, follow: false },
};

export default async function HomePreview() {
  const [boats, reviews] = await Promise.all([
    getFeaturedBoats().catch((error): BoatCard[] => {
      console.error("Error loading featured boats:", error);
      return [];
    }),
    getTestimonials()
      .then((res) => (res.success ? (res.data?.reviews ?? []) : []))
      .catch(() => []),
  ]);

  return (
    <>
      <PreviewNav />
      <main className="flex flex-col">
        <Hero />
        <Statement />
        <FleetReel boats={boats} />
        <Occasions />
        <Postcards />
        <Guestbook reviews={reviews} />
        <BrandBand />
        <Questions />
        <PlanSentence />
      </main>
      <Footer />
    </>
  );
}
