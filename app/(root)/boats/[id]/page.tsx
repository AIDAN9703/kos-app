import { getPublicBoat, getPublicBoatIds } from "@/features/boats/boat.data";
import { getServiceFee } from "@/features/app-settings/app-settings.data";
import { notFound } from "next/navigation";
import BoatDetails from "@/features/listing/components/BoatDetails";
import { BookingForm, MobileBookingDrawer } from "@/features/listing/components/booking-form/v2";
import { ImageGallery } from "@/features/listing/components/sub-components/ImageGallery";
import { Metadata } from "next";

// ================================
// ISR CONFIGURATION
// ================================

// Static generation with ISR - revalidate every 6 hours. Boat edits refresh
// the page right away (boat.actions.ts).
export const revalidate = 21600; // 6 hours

// Pre-render featured boats at build time; the rest render on first visit.
export async function generateStaticParams() {
  try {
    const ids = await getPublicBoatIds({ featuredOnly: true });
    return ids.slice(0, 50).map((id) => ({ id }));
  } catch (error) {
    console.error("❌ Error generating static params for boats:", error);
    // Pages will still be generated on-demand via ISR
    return [];
  }
}

// ================================
// METADATA GENERATION
// ================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const boat = await getPublicBoat(id);

    if (!boat) {
      return {
        title: "Boat Not Found | KOS Yachts",
        description: "The requested yacht could not be found.",
      };
    }

    // Calculate price range for meta description
    const priceRange =
      boat.pricingTiers && boat.pricingTiers.length > 0
        ? (() => {
            const prices = boat.pricingTiers.map((tier) => tier.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            return minPrice === maxPrice ? `$${minPrice}/hour` : `$${minPrice}-$${maxPrice}/hour`;
          })()
        : "Contact for pricing";

    const description = `Charter the ${boat.name}, a ${boat.lengthFt}ft ${boat.category}${boat.locationLabel ? ` in ${boat.locationLabel}` : ""}. ${priceRange}. ${boat.description?.substring(0, 100) || ""} Book your luxury yacht experience today.`;

    return {
      title: `${boat.name} - ${boat.lengthFt}ft ${boat.category} Charter | KOS Yachts`,
      description,
      keywords: [
        boat.name,
        boat.category,
        "yacht charter",
        "boat rental",
        boat.locationLabel,
        "luxury yacht",
        "Miami yacht charter",
      ]
        .filter(Boolean)
        .join(", "),
      openGraph: {
        title: `${boat.name} - Luxury Yacht Charter`,
        description,
        images: boat.mainImage
          ? [
              {
                url: boat.mainImage,
                width: 1200,
                height: 630,
                alt: `${boat.name} yacht charter`,
              },
            ]
          : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${boat.name} - Luxury Yacht Charter`,
        description,
        images: boat.mainImage ? [boat.mainImage] : [],
      },
      alternates: {
        canonical: `https://www.kosyachts.com/boats/${boat.id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for boat:", error);
    return {
      title: "Luxury Yacht Charter | KOS Yachts",
      description: "Discover luxury yacht charters in Miami with KOS Yachts.",
    };
  }
}

// ================================
// PAGE COMPONENT
// ================================

interface BoatPageProps {
  params: Promise<{ id: string }>;
}

// ================================
export default async function BoatPage({ params }: BoatPageProps) {
  const { id } = await params;
  const boat = await getPublicBoat(id);
  if (!boat) notFound();

  // Display rate for the price breakdown (refreshes with ISR). The amount
  // actually charged is always recalculated server-side at checkout.
  const serviceFee = await getServiceFee();

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: boat.name,
            description: boat.description,
            image: boat.mainImage,
            brand: {
              "@type": "Brand",
              name: "KOS Yachts",
            },
            category: boat.category,
            offers: boat.pricingTiers?.length
              ? {
                  "@type": "AggregateOffer",
                  lowPrice: Math.min(...boat.pricingTiers.map((tier) => tier.price)),
                  highPrice: Math.max(...boat.pricingTiers.map((tier) => tier.price)),
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                  url: `https://www.kosyachts.com/boats/${boat.id}`,
                }
              : undefined,
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "Length",
                value: `${boat.lengthFt} feet`,
              },
              {
                "@type": "PropertyValue",
                name: "Capacity",
                value: `${boat.capacity} passengers`,
              },
              {
                "@type": "PropertyValue",
                name: "Location",
                value: boat.locationLabel || "Contact for details",
              },
            ],
          }),
        }}
      />

      <main className="min-h-screen bg-white pb-28 pt-0 sm:pt-6 md:pb-16 lg:pb-0">
        {/* Full-width image gallery on mobile, constrained on desktop */}
        <div className="sm:pl-4">
          <ImageGallery
            mainImage={boat.mainImage || ""}
            galleryImages={boat.galleryImages || []}
            alt={boat.name}
          />
        </div>

        {/* Content section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:py-8 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-8 xl:gap-10">
            <div>
              <BoatDetails boat={boat} />
            </div>

            {/* Desktop booking form - hidden on mobile, shown on md+ screens */}
            <aside className="hidden md:block lg:-mt-16 xl:-mt-24 relative z-20">
              <div className="sticky top-24">
                <BookingForm boat={boat} serviceFee={serviceFee} />
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile booking bar - shown on mobile, hidden on md+ screens */}
        <div className="md:hidden">
          <MobileBookingDrawer boat={boat} serviceFee={serviceFee} />
        </div>
      </main>
    </>
  );
}
