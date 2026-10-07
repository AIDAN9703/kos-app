"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface ExperienceLayoutProps {
  title: string;
  description: string;
  heroImage: string;
  buttonText: string;
  buttonLink: string;
  heroAlt?: string;
  imageOverlayColor?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  children: ReactNode;
}

export default function ExperienceLayout({
  title,
  description,
  heroImage,
  buttonText,
  buttonLink,
  heroAlt = "Experience image",
  faqs = [],
  children,
}: ExperienceLayoutProps) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section - Centered */}
      <section className="relative w-full h-[75vh] sm:h-[80vh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt={heroAlt}
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/25 to-black/50" />
        </div>
        
        <div className="relative z-10 h-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto w-full text-center">
            <div className="text-white">
              <span className="inline-block text-white text-xs font-medium mb-2 tracking-wide uppercase animate-fade-in-up drop-shadow-md">
                Experience
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-4 leading-tight animate-fade-in-up [animation-delay:100ms] drop-shadow-lg text-shadow-lg">
                {title}
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-5 leading-relaxed animate-fade-in-up [animation-delay:200ms] font-light drop-shadow-md max-w-3xl mx-auto">
                {description}
              </p>
              <div className="flex justify-center animate-fade-in-up [animation-delay:300ms]">
                <Link href={buttonLink} aria-label={buttonText}>
                  <Button size="default" variant="outline" className="text-white border-white/40 hover:bg-white/10 px-6 py-2.5 text-sm font-medium">
                    {buttonText}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>

      {/* FAQs Section - Left Aligned */}
      {faqs.length > 0 && (
        <section className="py-10 md:py-14" id="faq-section">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-left mb-6 lg:mb-8 animate-fade-in-up">
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium mb-3 lg:mb-4 text-primary leading-tight">
                Common Questions
              </h2>
              <p className="text-gray-600 max-w-2xl text-base lg:text-lg font-light leading-relaxed">
                Find answers to the most common questions about this experience.
              </p>
            </div>
            
            <div className="space-y-3 lg:space-y-4">
              {faqs.map((faq, index) => (
                <details 
                  key={index} 
                  className={`group bg-white rounded-lg border border-gray-200 hover:shadow-xs transition-all duration-300 animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <summary className="flex items-center justify-between cursor-pointer p-4 lg:p-6">
                    <h3 className="text-sm sm:text-base lg:text-xl font-medium text-primary leading-tight pr-4">{faq.question}</h3>
                    <span className="ml-2 lg:ml-6 shrink-0 text-primary/60 group-open:rotate-180 transition-transform">
                      <svg width="20" height="20" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </summary>
                  <div className="px-4 pb-4 lg:px-6 lg:pb-6 text-gray-600 leading-relaxed font-light text-sm lg:text-base">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
            
            <div className="mt-8 lg:mt-10 text-left animate-fade-in-up [animation-delay:600ms]">
              <p className="text-gray-600 mb-3 lg:mb-4 font-light text-sm lg:text-base">Still have questions?</p>
              <Link href="/contact">
                <Button variant="outline" className="group border-primary text-primary hover:bg-primary hover:text-white px-4 lg:px-6 py-2 lg:py-3 font-medium text-sm lg:text-base">
                  Contact Our Support Team
                  <ArrowRight className="ml-2 h-3 w-3 lg:h-4 lg:w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

      