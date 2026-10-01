import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Users, Star } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Professional Marine Services | KOSyachts",
  description:
    "Comprehensive yacht and boat services including charter management, yacht management, sales, term charters, and dock management in Miami.",
};

// Force static generation - this page has no dynamic content
export const dynamic = "force-static";

// Define all services with their details
const services = [
  {
    id: "charter-management",
    title: "Charter Management",
    description:
      "Turn your vessel into a revenue-generating asset with our comprehensive charter management services.",
    image: "/images/services/charter-management.jpg",
    href: "/services/charter-management",
    category: "Management",
  },
  {
    id: "yacht-management",
    title: "Yacht Management",
    description:
      "Complete yacht care and maintenance solutions for owners seeking peace of mind.",
    image: "/images/services/yacht-management.jpg",
    href: "/services/yacht-management",
    category: "Management",
  },
  {
    id: "sales",
    title: "Sales & Brokerage",
    description:
      "Expert guidance for buying or selling vessels with professional representation.",
    image: "/images/services/sales.jpg",
    href: "/services/sales",
    category: "Sales",
  },
  {
    id: "term-charters",
    title: "Term Charters",
    description:
      "Extended luxury voyages with premium vessels and professional crews.",
    image: "/images/services/term-charters.jpg",
    href: "/services/term-charters",
    category: "Charter",
  },
  {
    id: "dock-management",
    title: "Dock Management",
    description:
      "Professional management services for private docks and marina facilities.",
    image: "/images/services/dock-management.jpg",
    href: "/services/dock-management",
    category: "Management",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full h-[75vh] sm:h-[80vh] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/services/services-hero.jpg"
            alt="Professional marine services"
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
                Professional Marine Services
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-4 leading-tight animate-fade-in-up [animation-delay:100ms] drop-shadow-lg">
                Complete Service Portfolio
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-5 leading-relaxed animate-fade-in-up [animation-delay:200ms] font-light drop-shadow-md max-w-2xl">
                From yacht management to charter services, we provide
                comprehensive marine solutions tailored to enhance your boating
                experience.
              </p>
              <div className="flex flex-wrap gap-3 animate-fade-in-up [animation-delay:300ms]">
                <Button
                  size="default"
                  variant="outline"
                  className="text-white border-white/40 hover:bg-white/10 px-6 py-2.5 text-sm font-medium"
                  asChild
                >
                  <Link href="#services">
                    Explore Services
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <span className="text-primary font-medium text-sm tracking-wide uppercase">
              Our Services
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-primary leading-tight">
              Professional Marine Solutions
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light leading-relaxed">
              We offer a comprehensive range of professional marine services
              designed to meet every aspect of your boating needs.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                className="group block"
              >
                <div className="bg-white rounded-lg shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full overflow-hidden">
                  {/* Image */}
                  <div className="relative h-[300px] md:h-[350px]">
                    <Image
                      src={service.image}
                      alt={service.title}
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
                        {service.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 md:p-8">
                    <h3 className="text-2xl md:text-3xl font-medium text-primary mb-3 leading-tight">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 font-light leading-relaxed text-sm md:text-base mb-4">
                      {service.description}
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

      {/* Why Choose KOS Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in-up">
            <span className="text-primary font-medium text-sm tracking-wide uppercase">
              Why Choose KOS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-primary leading-tight">
              The KOS Difference
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light leading-relaxed">
              Our commitment to excellence and attention to detail sets us apart
              in the marine services industry.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Industry Expertise",
                description:
                  "Decades of combined experience in marine services and yacht management",
              },
              {
                icon: <Star className="h-6 w-6" />,
                title: "Premium Quality",
                description:
                  "Uncompromising standards in every aspect of our service delivery",
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Personalized Service",
                description:
                  "Tailored solutions designed to meet your specific needs and preferences",
              },
            ].map((benefit, index) => (
              <div
                key={index}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-primary/5 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <div className="text-primary">{benefit.icon}</div>
                </div>
                <h3 className="text-xl font-medium text-primary mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-8 md:p-12 shadow-xs border border-gray-100 text-center">
            <h2 className="text-3xl md:text-4xl font-medium text-primary mb-6">
              Ready to Experience Premium Service?
            </h2>
            <p className="text-gray-600 mb-8 text-lg font-light max-w-2xl mx-auto leading-relaxed">
              Contact our experienced team to discuss how our professional
              marine services can enhance your boating lifestyle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white font-medium px-8 py-3"
                asChild
              >
                <Link href="/contact">
                  Contact Our Team
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white font-medium px-8 py-3"
                asChild
              >
                <Link href="/boats/search">Browse Our Fleet</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
