import { Metadata } from "next";
import Image from "next/image";

import {
  CheckCircle2,
  MapPin,
  Calendar,
  Users,
  Navigation,
  Globe,
} from "lucide-react";
import ExperienceLayout from "@/features/_marketing/experiences/components/ExperienceLayout";


export const metadata: Metadata = {
  title: "Sand Bar Excursions | KOSyachts",
  description:
    "Explore pristine sandbars and shallow water paradises with our luxury boat charters.",
};

// Force static generation - this page has no dynamic content
export const dynamic = "force-static";

// FAQs
const faqs = [
  {
    question: "What exactly is a sandbar excursion?",
    answer:
      "A sandbar excursion takes you to shallow areas where sand has accumulated to create natural islands or platforms just below or slightly above the water's surface. These scenic spots are perfect for wading, swimming, and relaxing in crystal-clear shallow waters.",
  },
  {
    question: "What should I bring for a sandbar trip?",
    answer:
      "We recommend bringing swimwear, towels, sunscreen, sunglasses, a hat, water shoes (optional but helpful), and a waterproof bag for personal items. We provide coolers with ice, fresh water, and can arrange food and beverages upon request.",
  },
  {
    question: "Are sandbar excursions good for families with children?",
    answer:
      "Absolutely! Sandbars are perfect for families with children of all ages. The shallow, calm waters provide a safe environment for kids to play, and the natural beauty creates a wonderful setting for family memories.",
  },
  {
    question: "How long do sandbar excursions typically last?",
    answer:
      "Our standard sandbar excursions range from 4-8 hours, with half-day and full-day options available. This gives you plenty of time to enjoy the sandbar, have lunch, swim, and relax. Custom durations can be arranged.",
  },
  {
    question: "What if weather conditions change during our excursion?",
    answer:
      "Your captain continuously monitors weather conditions. If conditions become unsafe, we'll return to port or find alternative sheltered locations. Safety is our priority, and we may modify or reschedule trips when necessary.",
  },
];

// Benefits of sandbar excursions
const benefits = [
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "Pristine Locations",
    description: "Access beautiful sandbars only reachable by boat",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Family Friendly",
    description: "Safe, shallow waters perfect for all ages",
  },
  {
    icon: <Navigation className="h-6 w-6" />,
    title: "Expert Navigation",
    description: "Captains who know the best sandbar spots",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Natural Beauty",
    description: "Crystal clear waters and white sand paradise",
  },
];

// Popular sandbars
const sandbars = [
  {
    name: "Haulover Sandbar",
    location: "Miami Beach",
    description:
      "A popular gathering spot with crystal clear waters and festive atmosphere.",
    features: ["Shallow waters", "Nearby restaurants", "Family-friendly"],
    image: "/images/experiences/hauloversandbar.jpeg",
  },
  {
    name: "Nixon Sandbar",
    location: "Key Biscayne",
    description:
      "A beautiful stretch of sand perfect for swimming and relaxing.",
    features: ["Private atmosphere", "Wildlife viewing", "Pristine conditions"],
    image: "/images/experiences/nixonsandbar.avif",
  },
  {
    name: "Whale Harbor Sandbar",
    location: "Islamorada",
    description:
      "A tranquil sandbar with shallow, turquoise waters and great views.",
    features: ["Sunset views", "Snorkeling spots", "Calm waters"],
    image: "/images/experiences/whaleharbor.jpg",
  },
  {
    name: "Peanut Island",
    location: "West Palm Beach",
    description:
      "More than just a sandbar, featuring walking trails and snorkeling spots.",
    features: ["Historic site", "Snorkeling lagoon", "Picnic facilities"],
    image: "/images/experiences/peanutisland.webp",
  },
];

export default function SandBarPage() {
  return (
    <ExperienceLayout
      title="Sand Bar Excursions"
      description="Discover paradise on our sandbar excursions, where pristine white sands meet crystal clear waters, accessible only by boat."
      heroImage="/images/experiences/whaleharbor.jpg"
      faqs={faqs}
      buttonText="Book Now"
      buttonLink="/contact"
    >
      {/* Sand Bar Services Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-left mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary leading-tight">
            Sand Bar Excursion Services
          </h2>
          <p className="text-gray-600 max-w-3xl text-lg font-light leading-relaxed">
            Discover the magic of Florida&apos;s hidden sandbars - natural white sand
            islands that emerge in shallow waters, creating perfect oases for
            relaxation and fun accessible only by boat.
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

      {/* Popular Sandbars Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-right mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary">
            Popular Sandbars
          </h2>
          <p className="text-gray-600 max-w-2xl ml-auto text-lg font-light">
            Explore these stunning sandbar locations, each offering its own
            unique experience and natural beauty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sandbars.map((sandbar, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="relative h-64">
                <Image
                  src={sandbar.image}
                  alt={sandbar.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Simple Logo Overlay */}
                <div className="absolute top-4 left-4">
                  <Image
                    src="/icons/transparent-white-logo.webp"
                    alt="KOS Logo"
                    width={50}
                    height={50}
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center mb-2">
                  <MapPin className="h-4 w-4 text-primary mr-2" />
                  <span className="text-sm text-gray-500 font-light">
                    {sandbar.location}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-primary mb-3">
                  {sandbar.name}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed mb-4">
                  {sandbar.description}
                </p>

                <div className="space-y-2">
                  {sandbar.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-primary mr-2" />
                      <span className="text-sm text-gray-600 font-light">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ExperienceLayout>
  );
}
