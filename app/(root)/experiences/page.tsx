import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Yacht Experiences | KOSyachts",
  description:
    "Discover unforgettable luxury yacht experiences in premium destinations. From fishing charters to celebration cruises.",
};

// Force static generation - this page has no dynamic content
export const dynamic = "force-static";

// Define all experience types with their details
const experiences = [
  {
    id: "fishing",
    title: "Fishing Charters",
    description:
      "Experience the thrill of deep-sea fishing with professional guides and premium equipment.",
    image: "/images/experiences/fishing.jpg",
    imageAlt: "Deep sea fishing charter",
    href: "/experiences/fishing",
    category: "Adventure",
  },
  {
    id: "watersports",
    title: "Water Sports Adventures",
    description:
      "Get your adrenaline pumping with jet skis, wakeboarding, and thrilling water activities.",
    image: "/images/experiences/tiki.jpg",
    imageAlt: "Water sports activities",
    href: "/experiences/watersports",
    category: "Adventure",
  },
  {
    id: "sand-bar",
    title: "Sand Bar Excursions",
    description:
      "Relax and enjoy pristine sandbar locations only accessible by luxury yacht.",
    image: "/images/experiences/hauloversandbar.jpeg",
    imageAlt: "Beautiful sandbar destination",
    href: "/experiences/sand-bar",
    category: "Relaxation",
  },
  {
    id: "special-events",
    title: "Special Events & Celebrations",
    description:
      "Host your special occasions on the water for truly unforgettable memories.",
    image: "/images/experiences/birthday.png",
    imageAlt: "Yacht celebration party",
    href: "/experiences/special-events",
    category: "Events",
  },
  {
    id: "term-charters",
    title: "Term Charters",
    description:
      "Extended luxury voyages with premium vessels and professional crews.",
    image: "/images/experiences/termcharter.avif",
    imageAlt: "Luxury term charter yacht",
    href: "/experiences/term-charters",
    category: "Luxury",
  },
];

export default function ExperiencesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full h-[75vh] sm:h-[80vh] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/experiences/sunset.jpg"
            alt="Luxury yacht experiences"
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-3xl text-white">
              <span className="inline-block text-white text-xs font-medium mb-2 tracking-wide uppercase animate-fade-in-up drop-shadow-md">
                Luxury Experiences
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-4 leading-tight animate-fade-in-up [animation-delay:100ms] drop-shadow-lg">
                Unforgettable Yacht Experiences
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-5 leading-relaxed animate-fade-in-up [animation-delay:200ms] font-light drop-shadow-md max-w-2xl">
                Discover unique luxury adventures on the water, perfectly
                crafted for every occasion and expertly tailored to create
                lasting memories.
              </p>
              <div className="flex flex-wrap gap-3 animate-fade-in-up [animation-delay:300ms]">
                <Button
                  size="default"
                  variant="outline"
                  className="text-white border-white/40 hover:bg-white/10 px-6 py-2.5 text-sm font-medium"
                  asChild
                >
                  <Link href="#experiences">
                    Explore Experiences
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experiences Section */}
      <section id="experiences" className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <span className="text-primary font-medium text-sm tracking-wide uppercase">
              Our Experiences
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-primary leading-tight">
              Choose Your Perfect Experience
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light leading-relaxed">
              From thrilling adventures to peaceful escapes, our curated
              experiences offer something special for every taste and occasion.
            </p>
          </div>

          {/* Experiences Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {experiences.map((experience) => (
              <Link
                key={experience.id}
                href={experience.href}
                className="group block"
              >
                <div className="bg-white rounded-lg shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full overflow-hidden">
                  {/* Image */}
                  <div className="relative h-[300px] md:h-[350px]">
                    <Image
                      src={experience.image}
                      alt={experience.imageAlt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={90}
                    />

                    {/* Simple Logo Overlay */}
                    <div className="absolute top-6 left-6">
                      <Image
                        src="/icons/transparent-white-logo.webp"
                        alt="KOS Logo"
                        width={60}
                        height={60}
                        className="object-contain"
                      />
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-6 right-6">
                      <span className="bg-white text-primary text-sm font-medium px-3 py-1 rounded-full shadow-xs">
                        {experience.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 md:p-8">
                    <h3 className="text-2xl md:text-3xl font-medium text-primary mb-3 leading-tight">
                      {experience.title}
                    </h3>
                    <p className="text-gray-600 font-light leading-relaxed text-sm md:text-base mb-4">
                      {experience.description}
                    </p>
                    <div className="flex items-center text-primary font-medium group-hover:text-primary/80 transition-colors">
                      <span className="text-sm">Learn More</span>
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-8 md:p-12 shadow-xs border border-gray-100 text-center">
            <h2 className="text-3xl md:text-4xl font-medium text-primary mb-6">
              Ready for Your Next Adventure?
            </h2>
            <p className="text-gray-600 mb-8 text-lg font-light max-w-2xl mx-auto leading-relaxed">
              Our experienced team and premium fleet await to make your dream
              yacht experience a reality.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white font-medium px-8 py-3"
                asChild
              >
                <Link href="/boats/search">
                  Browse Our Fleet
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white font-medium px-8 py-3"
                asChild
              >
                <Link href="/contact">Contact Our Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
