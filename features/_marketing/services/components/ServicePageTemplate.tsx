"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight, CheckCircle, Phone, Calendar, Users, Headphones } from "lucide-react";

interface ServiceStat {
  value: string;
  label: string;
}


export interface ServiceFeature {
  title: string;
  description: string;
}

interface ServiceStep {
  title: string;
  description: string;
}

export interface ServicePageProps {
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  features: ServiceFeature[];
  secondaryImage: string;
  stats?: ServiceStat[];
  steps?: ServiceStep[];
  faqItems?: Array<{ question: string; answer: string }>;
}

const ServicePageTemplate: React.FC<ServicePageProps> = ({
  title,
  subtitle,
  description,
  heroImage,
  features,
  secondaryImage,
  stats = [],
  faqItems = [],
}) => {
  // Display only the first 3 stats
  const displayStats = stats.slice(0, 3);

  // Memoized scroll handler for smooth scrolling
  const scrollToContact = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const contactSection = document.getElementById("contact-section");
    contactSection?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full h-[75vh] sm:h-[80vh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt={title}
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/60" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-3xl text-white">
              <span className="inline-block text-white text-xs font-medium mb-2 tracking-wide uppercase animate-fade-in-up drop-shadow-md">
                {subtitle}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-4 leading-tight animate-fade-in-up [animation-delay:100ms] drop-shadow-lg text-shadow-lg">
                {title}
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-5 leading-relaxed animate-fade-in-up [animation-delay:200ms] font-light drop-shadow-md max-w-2xl">
                {description}
              </p>
              <div className="flex flex-wrap gap-3 animate-fade-in-up [animation-delay:300ms]">
                <Link href="/contact" aria-label="Contact">
                  <Button
                    size="default"
                    variant="outline"
                    className="text-white border-white/40 hover:bg-white/10 px-6 py-2.5 text-sm font-medium"
                  >
                    <Phone className="mr-2 h-4 w-4" /> Contact
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      {displayStats.length > 0 && (
        <section className="relative -mt-12 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {displayStats.map((stat, index) => (
                  <div
                    key={index}
                    className="px-8 py-6 text-center group hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="text-3xl md:text-4xl font-semibold mb-2 text-primary">
                      {stat.value}
                    </div>
                    <div className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Introduction Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 animate-fade-in-left">
              <span className="text-primary font-medium text-sm tracking-wide uppercase">
                About {title}
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-primary leading-tight">
                Excellence in Every Detail
              </h2>

              <p className="text-gray-600 mb-8 text-lg leading-relaxed font-light">
                At KOS, we understand that every client has unique needs. Our{" "}
                {title.toLowerCase()} services are designed to provide seamless
                experiences with attention to every detail. Our team of experts
                brings years of industry experience and a passion for excellence
                to every project.
              </p>

              <div className="flex items-center mb-8 gap-4">
                <div className="bg-gold/10 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-medium text-lg text-primary">
                    Schedule a Consultation
                  </h3>
                  <p className="text-gray-500 font-light">
                    Free 30-minute initial consultation
                  </p>
                </div>
              </div>

              <Link href="https://api.leadconnectorhq.com/widget/bookings/kos-calendars">
                <Button
                  variant="outline"
                  className="group border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 font-medium relative overflow-hidden"
                >
                  <span className="relative z-10">Book a Meeting</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 relative z-10" />
                  {/* Elegant fill animation */}
                  <div className="absolute inset-0 bg-linear-to-r from-primary to-primary/90 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                </Button>
              </Link>
            </div>

            <div className="order-1 lg:order-2 relative animate-fade-in-right">
              <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={secondaryImage}
                  alt={`${title} service`}
                  fill
                  className="object-cover"
                  quality={90}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Modern Logo Overlay */}
                <div className="absolute top-6 left-6">
                  <Image
                    src="/icons/transparent-white-logo.webp"
                    alt="KOS Logo"
                    width={80}
                    height={80}
                    className="object-contain"
                    quality={90}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in-up">
            <span className="text-primary font-medium text-sm tracking-wide uppercase">
              Why Choose Us
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-primary">
              The KOS Advantage
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light">
              When you choose our {title} services, you&apos;re choosing excellence
              at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-white rounded-lg p-6 shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className="flex items-start gap-4">
                    <div className="bg-gold/10 p-3 rounded-lg shrink-0">
                      <CheckCircle className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-primary mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed font-light">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add additional standard features to make 6 total */}
            {features.length < 6 &&
              [
                {
                  title: "24/7 Support",
                  description:
                    "Round-the-clock support ensures you're never left without assistance when you need it most.",
                },
                {
                  title: "Personalized Service",
                  description:
                    "Every client receives tailored solutions designed specifically for their unique requirements and preferences.",
                },
              ]
                .slice(0, 6 - features.length)
                .map((extraFeature, index) => (
                  <div
                    key={`extra-${index}`}
                    className="group animate-fade-in-up"
                    style={{
                      animationDelay: `${(features.length + index) * 100}ms`,
                    }}
                  >
                    <div className="bg-white rounded-lg p-6 shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full">
                      <div className="flex items-start gap-4">
                        <div className="bg-gold/10 p-3 rounded-lg shrink-0">
                          {index === 0 ? (
                            <Headphones className="h-6 w-6 text-gold" />
                          ) : (
                            <Users className="h-6 w-6 text-gold" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-medium text-primary mb-3">
                            {extraFeature.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed font-light">
                            {extraFeature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {faqItems.length > 0 && (
        <section className="py-16 md:py-20" id="faq-section">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 animate-fade-in-up">
              <span className="text-primary font-medium text-sm tracking-wide uppercase">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-primary">
                Common Questions
              </h2>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light">
                Find answers to the most common questions about our {title}{" "}
                services.
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className={`group bg-white rounded-lg border border-gray-200 hover:shadow-xs transition-all duration-300 animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <summary className="flex items-center justify-between cursor-pointer p-6">
                    <h3 className="text-xl font-medium text-primary">
                      {item.question}
                    </h3>
                    <span className="ml-6 shrink-0 text-primary/60 group-open:rotate-180 transition-transform">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 9L12 15L18 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed font-light">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>

            <div className="mt-10 text-center animate-fade-in-up [animation-delay:600ms]">
              <p className="text-gray-600 mb-4 font-light">
                Still have questions?
              </p>
              <Link href="/contact" onClick={scrollToContact}>
                <Button
                  variant="outline"
                  className="group border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 font-medium"
                >
                  Contact Our Support Team
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ServicePageTemplate;
