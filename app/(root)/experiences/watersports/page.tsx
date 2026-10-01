import { Metadata } from "next";
import Image from "next/image";

import { Calendar, Users, Navigation, Globe } from "lucide-react";
import ExperienceLayout from "@/features/_marketing/experiences/components/ExperienceLayout";


export const metadata: Metadata = {
  title: "Water Sports Adventures | KOSyachts",
  description:
    "Experience thrilling water sports activities with our premium charter boats and professional guides.",
};

// Force static generation - this page has no dynamic content
export const dynamic = "force-static";

// FAQs
const faqs = [
  {
    question: "Do I need prior experience for water sports activities?",
    answer:
      "No prior experience is necessary for most activities. Our experienced instructors provide full safety briefings and guidance for beginners. Some advanced activities may require basic skills.",
  },
  {
    question: "What should I bring for a water sports charter?",
    answer:
      "We recommend bringing swimwear, towels, sunscreen, sunglasses, and a change of clothes. All specialized equipment (life jackets, wetsuits if needed, etc.) is provided.",
  },
  {
    question: "Are water sports activities safe for children?",
    answer:
      "Yes, many activities are family-friendly and safe for children. Age requirements vary by activity, typically starting from 5-8 years old depending on the sport. Our team will help you select appropriate activities for your group.",
  },
  {
    question: "What if the weather conditions are unfavorable?",
    answer:
      "Safety is our priority. If weather conditions are unsuitable for water sports, we'll work with you to reschedule or modify your charter. Full refunds are available if we need to cancel due to weather.",
  },
  {
    question: "Can we customize our water sports package?",
    answer:
      "Absolutely! We can create a custom package based on your group's interests, experience levels, and preferences. Just let us know what activities you're most interested in.",
  },
];

// Benefits of watersports
const benefits = [
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "Variety of Activities",
    description: "Multiple thrilling watersports in a single charter",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Professional Instruction",
    description: "Expert guidance for beginners and advanced riders",
  },
  {
    icon: <Navigation className="h-6 w-6" />,
    title: "Premium Equipment",
    description: "Top-quality gear for optimal performance and safety",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Ideal Locations",
    description: "Access to the best spots for each activity",
  },
];

// Water sports activities
const activities = [
  {
    name: "Jet Skiing",
    description:
      "Experience the thrill of riding across the water at high speeds on our premium jet skis.",
    image: "/images/experiences/jetski.webp",
  },
  {
    name: "Wakeboarding",
    description:
      "Ride the wake behind the boat while performing exciting jumps and tricks on a wakeboard.",
    image: "/images/experiences/wakeboarding.jpg",
  },
  {
    name: "Water Skiing",
    description:
      "A classic water sport that provides excitement and challenge for all skill levels.",
    image: "/images/experiences/waterski.jpg",
  },
  {
    name: "Tubing",
    description:
      "Hold on tight as you're pulled behind the boat on an inflatable tube - fun for all ages!",
    image: "/images/experiences/watertubing.jpeg",
  },
  {
    name: "Paddleboarding",
    description:
      "Explore calm waters at your own pace on a stand-up paddleboard.",
    image: "/images/experiences/paddleboarding.jpg",
  },
  {
    name: "Snorkeling",
    description:
      "Discover the underwater world and marine life in crystal clear waters.",
    image: "/images/experiences/snorkling.jpg",
  },
];

export default function WatersportsPage() {
  return (
    <ExperienceLayout
      title="Water Sports Adventures"
      description="Get your adrenaline pumping with exciting water sports activities. From jet skis to wakeboarding, there's something for everyone."
      heroImage="/images/experiences/wakeboarding.jpg"
      faqs={faqs}
      buttonText="Book Now"
      buttonLink="/contact"
    >
      {/* Water Sports Services Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-left mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary leading-tight">
            Water Sports Services
          </h2>
          <p className="text-gray-600 max-w-3xl text-lg font-light leading-relaxed">
            Whether you&apos;re seeking an adrenaline rush or a fun family activity,
            our water sports charters offer something for everyone with
            professional instructors and premium equipment.
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

      {/* Popular Activities Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-right mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary">
            Popular Activities
          </h2>
          <p className="text-gray-600 max-w-2xl ml-auto text-lg font-light">
            Choose from our wide range of exciting water sports activities for
            all skill levels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="relative h-48">
                <Image
                  src={activity.image}
                  alt={activity.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                <h3 className="text-xl font-medium text-primary mb-3">
                  {activity.name}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ExperienceLayout>
  );
}
