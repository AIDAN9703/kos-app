import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Calendar, Users, Navigation, Globe } from "lucide-react";
import ExperienceLayout from "@/features/_marketing/experiences/components/ExperienceLayout";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Special Events & Celebrations | KOSyachts",
  description:
    "Host unforgettable special events and celebrations on our luxury charter boats.",
};

// Force static generation - this page has no dynamic content
export const dynamic = "force-static";

// FAQs
const faqs = [
  {
    question: "How many guests can I have for my special event?",
    answer:
      "Our fleet can accommodate events of various sizes, from intimate gatherings of 6-8 people to larger events with up to 150 guests. Capacity depends on the vessel selected and the type of event.",
  },
  {
    question: "Can I bring my own food and drinks?",
    answer:
      "Yes, many of our charter options allow you to bring your own refreshments. We also offer catering services and bar packages if you prefer to have everything arranged for you. Our team can discuss the best options for your event.",
  },
  {
    question: "Can I decorate the boat for my event?",
    answer:
      "Yes, tasteful decorations are welcome. Please discuss your decoration plans with us in advance so we can ensure they're compatible with the vessel. We can also arrange professional decoration services for your event.",
  },
  {
    question: "What happens in case of bad weather?",
    answer:
      "We monitor weather conditions closely. If conditions are unsafe, we'll work with you to reschedule your event or provide alternatives. For smaller events, some vessels offer indoor spaces that can still make for a great celebration regardless of weather.",
  },
  {
    question: "How far in advance should I book a special event charter?",
    answer:
      "We recommend booking at least 2-3 months in advance for most events, and 6+ months for larger events like weddings. Popular dates in peak season can book up quickly, so earlier is always better.",
  },
];

// Special event types
const specialEventTypes = [
  {
    title: "Day Charters",
    description:
      "Perfect for a day of fun on the water with friends and family.",
    image: "/images/experiences/daycharters4.png",
    features: [
      "Half-day & full-day options",
      "Flexible scheduling",
      "Group activities",
    ],
    popular: true,
  },
  {
    title: "Bachelor/Bachelorette Parties",
    description:
      "Give the bride or groom-to-be an unforgettable day with friends on a luxury yacht or party boat.",
    image: "/images/experiences/bachelorette.jpg",
    features: [
      "Privacy & exclusivity",
      "Premium sound system",
      "Special packages",
    ],
    popular: true,
  },
  {
    title: "Corporate Events",
    description:
      "Impress new clients and reward your team in style with a corporate outing that stands out.",
    image: "/images/experiences/corporateevents.webp",
    features: ["Meeting facilities", "Team building", "Catering options"],
    popular: true,
  },
  {
    title: "Birthdays",
    description:
      "Make your birthday truly memorable with a celebration on the water. Perfect for milestone birthdays or annual celebrations.",
    image: "/images/experiences/birthday2.webp",
    features: ["Custom cake options", "Decorations", "Photography service"],
    popular: false,
  },
  {
    title: "Sunset Cruise",
    description:
      "Experience breathtaking sunsets while on the water with a romantic or social cruise.",
    image: "/images/experiences/sunset.jpg",
    features: ["Romantic setting", "Gourmet dining", "Private moments"],
    popular: false,
  },
  {
    title: "High Capacity Events",
    description:
      "Perfect for large groups and special celebrations that need extra space and amenities.",
    image: "/images/experiences/highcapacity.png",
    features: ["Large group capacity", "Multiple decks", "Entertainment areas"],
    popular: false,
  },
  {
    title: "Anniversaries",
    description:
      "Celebrate your love with a romantic anniversary cruise, complete with sunset views and champagne.",
    image: "/images/experiences/anniversary.jpg",
    features: ["Romantic setting", "Gourmet dining", "Private moments"],
    popular: false,
  },
  {
    title: "Wedding Ceremonies",
    description:
      "Say 'I do' with the beautiful water as your backdrop. We can accommodate both the ceremony and reception.",
    image: "/images/experiences/wedding-ceremony.webp",
    features: [
      "Ceremony setup",
      "Reception options",
      "Professional coordination",
    ],
    popular: false,
  },
];

export default function SpecialEventsPage() {
  return (
    <ExperienceLayout
      title="Special Events & Celebrations"
      description=""
      heroImage="/images/experiences/night-yacht-event.webp"
      faqs={faqs}
      buttonText="Plan Your Event"
      buttonLink="/contact"
    >
      {/* Special Event Services Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="text-left mb-10 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary leading-tight">
            Special Event Services
          </h2>
          <p className="text-gray-600 max-w-3xl text-lg font-light leading-relaxed">
            From intimate gatherings to grand celebrations, we provide
            comprehensive event services to make your special moments truly
            unforgettable on the water.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8 auto-rows-fr">
          {[
            {
              icon: <Calendar className="h-5 w-5 lg:h-6 lg:w-6" />,
              title: "Event Planning",
              desc: "Complete coordination and timeline management",
            },
            {
              icon: <Users className="h-5 w-5 lg:h-6 lg:w-6" />,
              title: "Catering",
              desc: "Gourmet dining and custom menus",
            },
            {
              icon: <Navigation className="h-5 w-5 lg:h-6 lg:w-6" />,
              title: "Entertainment",
              desc: "Premium sound and lighting systems",
            },
            {
              icon: <Globe className="h-5 w-5 lg:h-6 lg:w-6" />,
              title: "Photography",
              desc: "Professional photo and video services",
            },
            {
              icon: <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6" />,
              title: "Decorations",
              desc: "Custom styling and elegant decor",
            },
            {
              icon: <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6" />,
              title: "Logistics",
              desc: "Seamless event coordination",
            },
          ].map((service, index) => (
            <div
              key={index}
              className="group animate-fade-in-up h-full"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white rounded-lg p-4 lg:p-6 shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                <div className="bg-gold/10 p-3 lg:p-4 rounded-lg w-12 h-12 lg:w-14 lg:h-14 mb-4 lg:mb-6 flex items-center justify-center">
                  <div className="text-gold">{service.icon}</div>
                </div>
                <h3 className="text-base lg:text-xl font-medium text-primary mb-2 lg:mb-3 leading-tight">
                  {service.title}
                </h3>
                <p className="text-sm lg:text-base text-gray-600 leading-relaxed font-light grow line-clamp-2">
                  {service.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Special Event Types Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-right mb-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary">
            Special Event Types
          </h2>
          <p className="text-gray-600 max-w-2xl ml-auto text-lg font-light">
            From intimate gatherings to grand celebrations, we specialize in
            creating memorable events for every occasion.
          </p>
        </div>

        {/* Mobile: 2 columns minimum, Desktop: 3 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-8">
          {specialEventTypes.map((event, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg border transition-all duration-300 hover:shadow-lg overflow-hidden flex flex-col h-full ${
                event.popular
                  ? "border-gold shadow-md relative"
                  : "border-gray-200 hover:border-primary/30"
              }`}
            >
              {event.popular && (
                <div className="absolute top-0 left-0 rounded-br-md z-10">
                  <span className="bg-gold text-white text-xs lg:text-sm font-medium py-1 px-2 rounded-br-lg">
                    Popular
                  </span>
                </div>
              )}

              <div className="relative h-28 sm:h-32 lg:h-48">
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>

              <div className="p-3 lg:p-6 flex flex-col grow">
                <h3 className="text-sm sm:text-base lg:text-xl font-medium text-primary mb-2 lg:mb-3">
                  {event.title}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed mb-3 lg:mb-4 grow text-xs sm:text-sm lg:text-base">
                  {event.description}
                </p>

                <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-6">
                  {event.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <CheckCircle2 className="h-3 w-3 lg:h-4 lg:w-4 text-primary mr-2 shrink-0" />
                      <span className="text-xs lg:text-sm text-gray-600 font-light">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <Button
                    variant={null}
                    className={`w-full h-7 sm:h-8 lg:h-10 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg lg:rounded-xl font-medium transition-all duration-300 inline-flex items-center justify-center text-xs lg:text-sm ${
                      event.popular
                        ? "text-gold border border-gold hover:bg-gold hover:text-white"
                        : "bg-white text-primary border border-primary hover:bg-primary hover:text-white"
                    }`}
                    asChild
                  >
                    <Link href="/contact">Plan Event</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ExperienceLayout>
  );
}
