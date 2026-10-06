import { Metadata } from "next";
import { Users, MapPin, Shield, CheckCircle, Anchor } from "lucide-react";
import ExperienceLayout from "@/features/_marketing/experiences/components/ExperienceLayout";
import RequestTermCharter from "./RequestTermCharter";
import { getTermCharterBoats } from "@/features/boats/boat.data";
import type { BoatCard } from "@/features/boats/boat.types";
import BoatListingCard from "@/features/boats/components/BoatListingCard";

export const metadata: Metadata = {
  title: "Term Charter Adventures | KOS",
  description:
    "Experience extended luxury voyages with our premium term charter services - from weekend getaways to month-long adventures.",
};

// FAQs
const faqs = [
  {
    question: "What is a term charter?",
    answer:
      "A term charter is an extended boat rental, typically ranging from several days to weeks or months. Unlike day charters, term charters include overnight accommodations and allow for exploration of multiple destinations with professional crew.",
  },
  {
    question: "What's included in a term charter?",
    answer:
      "Our term charters include the vessel, professional crew, onboard accommodations, insurance, and standard equipment. Food, beverages, fuel, and dockage can be included in all-inclusive packages or arranged separately based on your preferences.",
  },
  {
    question: "Do I need boating experience?",
    answer:
      "No experience is necessary as our term charters include professional crew who handle all aspects of vessel operation. You can be as involved or hands-off as you prefer - it's your adventure.",
  },
  {
    question: "What destinations are available?",
    answer:
      "Popular destinations include the Bahamas, Caribbean islands, Florida Keys, and Mediterranean (seasonal). We can customize itineraries based on your interests, time available, and seasonal considerations.",
  },
  {
    question: "How far in advance should I book?",
    answer:
      "We recommend booking 2-3 months in advance for most charters, and 6+ months for peak season or special occasions. Popular destinations and dates book quickly, especially during winter months.",
  },
];

// Benefits
const benefits = [
  {
    icon: <Anchor className="h-5 w-5 lg:h-6 lg:w-6" />,
    title: "Epic Multi-Day Adventures",
    description:
      "From weekend escapes to month-long expeditions across paradise",
  },
  {
    icon: <Users className="h-5 w-5 lg:h-6 lg:w-6" />,
    title: "Pro Crew Included",
    description: "Skilled captains who know every secret spot and hidden gem",
  },
  {
    icon: <MapPin className="h-5 w-5 lg:h-6 lg:w-6" />,
    title: "Island Hop in Style",
    description: "Explore multiple destinations with luxury as your base",
  },
  {
    icon: <Shield className="h-5 w-5 lg:h-6 lg:w-6" />,
    title: "All-Inclusive Luxury",
    description: "Premium packages with gourmet dining and top-shelf service",
  },
];

export default async function TermChartersPage() {
  const termCharterBoats = await getTermCharterBoats().catch((error): BoatCard[] => {
    console.error("Error fetching term charter boats:", error);
    return [];
  });

  return (
    <ExperienceLayout
      title="Term Charter Adventures"
      description="Escape the ordinary with extended luxury voyages. From weekend getaways to month-long adventures, discover the freedom of the open water."
      heroImage="/images/experiences/yacht-ppl-swim.jpg"
      buttonText="Plan Your Adventure"
      buttonLink="#request-quote"
      faqs={faqs}
    >
      {/* Term Charter Services Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-left mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary leading-tight">
            Term Charter Services
          </h2>
          <p className="text-gray-600 max-w-3xl text-lg font-light leading-relaxed">
            When you choose our term charter services, you&apos;re choosing
            excellence at every step with extended luxury voyages and
            professional crew support.
          </p>
        </div>

        {/* Services Grid - Mobile: 2 columns minimum */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 auto-rows-fr">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group animate-fade-in-up h-full"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white rounded-lg p-3 lg:p-6 shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                <div className="bg-gold/10 p-2 lg:p-3 rounded-lg w-8 h-8 lg:w-12 lg:h-12 mb-2 lg:mb-4 flex items-center justify-center">
                  <div className="text-gold">{benefit.icon}</div>
                </div>
                <h3 className="text-sm lg:text-xl font-medium text-primary mb-1 lg:mb-3 leading-tight">
                  {benefit.title}
                </h3>
                <p className="text-xs lg:text-base text-gray-600 leading-snug lg:leading-relaxed font-light grow line-clamp-2">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-right mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary">
            Everything You Need
          </h2>
          <p className="text-gray-600 max-w-2xl ml-auto text-lg font-light">
            Our term charters provide everything you need for a successful and
            memorable extended journey.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:gap-8">
          {/* Included Items */}
          <div className="bg-white rounded-lg p-4 lg:p-8 shadow-xs border border-gray-100">
            <h3 className="text-sm lg:text-xl font-medium text-primary mb-4 lg:mb-6">
              Included in Every Charter
            </h3>
            <div className="space-y-2 lg:space-y-4">
              {[
                "Luxury yacht with full accommodations",
                "Professional captain and crew",
                "All safety equipment and insurance",
                "Premium utilities (Wi-Fi, power, water)",
                "Water toys and deck equipment",
                "Welcome provisions and setup",
              ].map((item, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-3 w-3 lg:h-5 lg:w-5 text-primary shrink-0 mt-0.5 mr-2 lg:mr-3" />
                  <span className="text-gray-700 font-light text-xs lg:text-base">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Add-ons */}
          <div className="bg-white rounded-lg p-4 lg:p-8 shadow-xs border border-gray-100">
            <h3 className="text-sm lg:text-xl font-medium text-primary mb-4 lg:mb-6">
              Premium Add-ons
            </h3>
            <div className="space-y-2 lg:space-y-4">
              {[
                "Gourmet chef and custom meals",
                "Premium bar and beverage packages",
                "Water sports and instruction",
                "Spa services and wellness",
                "Shore excursions and tours",
                "Special event coordination",
              ].map((item, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-3 w-3 lg:h-5 lg:w-5 text-gold shrink-0 mt-0.5 mr-2 lg:mr-3" />
                  <span className="text-gray-700 font-light text-xs lg:text-base">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Available Fleet */}
      {termCharterBoats.length > 0 && (
        <section className="py-10 md:py-14 bg-white">
          <div className="text-center mb-8 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary">
              Term Charter Vessels
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light">
              Premium yachts ready for your extended journey
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {termCharterBoats.map((boat, index) => (
              <div
                key={boat.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <BoatListingCard
                  boat={boat}
                  index={index}
                  size="md"
                  showPrice={false}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Request Form */}
      <section id="request-quote" className="py-10 md:py-14 bg-white">
        <div className="text-left mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary leading-tight">
            Plan Your Extended Voyage
          </h2>
          <p className="text-gray-600 max-w-2xl text-lg font-light leading-relaxed">
            Share your vision and our specialists will create a custom adventure
            tailored to your preferences.
          </p>
        </div>
        <RequestTermCharter />
      </section>
    </ExperienceLayout>
  );
}
