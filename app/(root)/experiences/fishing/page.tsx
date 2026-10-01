import { Metadata } from "next";

import Link from "next/link";
import { CheckCircle2, Navigation, Fish, Shield, Clock } from "lucide-react";
import ExperienceLayout from "@/features/_marketing/experiences/components/ExperienceLayout";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Deep Sea Fishing Charters | KOSyachts",
  description: "Experience world-class deep sea fishing with professional guides, premium equipment, and luxury vessels in Miami's best fishing grounds.",
};

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static';

// FAQs
const faqs = [
  {
    question: "Do I need to bring my own fishing gear?",
    answer: "No, all our fishing charters include professional-grade fishing gear and equipment. However, if you have a preference for your own gear, you're welcome to bring it along."
  },
  {
    question: "Is a fishing license included?",
    answer: "Yes, our charters include fishing licenses for all guests on board. You don't need to worry about arranging this separately."
  },
  {
    question: "What fish species can I expect to catch?",
    answer: "Depending on the season and location, you may catch mahi-mahi, sailfish, marlin, tuna, wahoo, snapper, and more. Our captains know the best spots for the season."
  },
  {
    question: "Are fishing charters suitable for beginners?",
    answer: "Absolutely! Our experienced captains and crew provide guidance for anglers of all skill levels, from first-timers to experienced fishermen."
  },
  {
    question: "Can we keep the fish we catch?",
    answer: "Yes, you can keep your legal catch. Our crew will clean and fillet your fish upon request, ready for you to take home or to a local restaurant for preparation."
  }
];

// Key features of fishing charters
const features = [
  {
    icon: <Navigation className="h-6 w-6" />,
    title: "Expert Captains",
    description: "Professional guides who know the best fishing spots and techniques for each season"
  },
  {
    icon: <Fish className="h-6 w-6" />,
    title: "Premium Equipment",
    description: "Top-of-the-line fishing gear, tackle, and safety equipment included"
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "All Licenses Included",
    description: "Fishing licenses, permits, and insurance coverage for all guests"
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Flexible Duration",
    description: "Half-day, full-day, and multi-day charter options available"
  }
];

// Charter options
const charterOptions = [
  {
    title: "Half-Day Charter",
    duration: "4 Hours",
    description: "Perfect for beginners or those with limited time. These trips typically stay in nearshore waters targeting abundant species like snapper and mahi-mahi.",
    highlights: ["Nearshore fishing", "Beginner-friendly", "Light tackle fishing", "Refreshments included"],
    price: "Starting from $600"
  },
  {
    title: "Full-Day Charter",
    duration: "8 Hours",
    description: "Our most popular option, allowing time to reach offshore fishing grounds and target multiple species. Includes drinks and lunch on board.",
    highlights: ["Offshore fishing", "Multiple species", "Lunch included", "Professional photos"],
    price: "Starting from $1,100",
    popular: true
  },
  {
    title: "Tournament Prep",
    duration: "Custom",
    description: "Specialized training and practice sessions for serious anglers preparing for fishing tournaments with expert guidance.",
    highlights: ["Expert coaching", "Tournament techniques", "Strategy development", "Custom duration"],
    price: "Custom pricing"
  }
];

export default function FishingPage() {
  return (
    <ExperienceLayout
      title="Fishing Charters"
      description="Experience world-class fishing with our professional guides and premium vessels, perfect for both novice and experienced anglers seeking the ultimate catch."
      heroImage="/images/experiences/fish3.jpg"
      faqs={faqs}
      buttonText="Book Your Charter"
      buttonLink="/boats/search"
    >
      {/* Fishing Services Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-left mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary leading-tight">
            Fishing Charter Services
          </h2>
          <p className="text-gray-600 max-w-3xl text-lg font-light leading-relaxed">
            Whether you&apos;re an experienced angler or a beginner, our fishing charters provide unforgettable 
            experiences with expert captains and premium vessels on Miami&apos;s pristine waters.
          </p>
        </div>
        
        {/* Services Grid - Mobile: 2 columns minimum */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 auto-rows-fr">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group animate-fade-in-up h-full"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white rounded-lg p-3 lg:p-6 shadow-xs border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                <div className="bg-gold/10 p-2 lg:p-3 rounded-lg w-8 h-8 lg:w-12 lg:h-12 mb-2 lg:mb-4 flex items-center justify-center">
                  <div className="text-gold">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-sm lg:text-xl font-medium text-primary mb-1 lg:mb-3 leading-tight">{feature.title}</h3>
                <p className="text-xs lg:text-base text-gray-600 leading-snug lg:leading-relaxed font-light grow line-clamp-2">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      
      {/* Charter Options Section */}
      <section className="py-10 md:py-14 bg-white">
        <div className="text-right mb-8 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 text-primary">
            Choose Your Charter Experience
          </h2>
          <p className="text-gray-600 max-w-2xl ml-auto text-lg font-light">
            Select from our range of charter options designed to suit your schedule and fishing preferences.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-8">
          {charterOptions.map((option, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-lg border transition-all duration-300 hover:shadow-lg overflow-hidden flex flex-col h-full ${
                option.popular 
                  ? 'border-gold shadow-md relative' 
                  : 'border-gray-200 hover:border-primary/30'
              }`}
            >
              {option.popular && (
                <div className="absolute top-0 left-0 rounded-br-md z-10">
                  <span className="bg-gold text-white text-xs lg:text-sm font-medium py-1 px-2 rounded-br-lg">
                    Popular
                  </span>
                </div>
              )}
              
              <div className="p-3 lg:p-6 flex flex-col grow">
                <h3 className="text-sm sm:text-base lg:text-xl font-medium text-primary mb-2 lg:mb-3">{option.title}</h3>
                <p className="text-primary/70 font-medium mb-2 text-xs lg:text-sm">{option.duration}</p>
                <p className="text-gray-600 font-light leading-relaxed mb-3 lg:mb-4 grow text-xs sm:text-sm lg:text-base">{option.description}</p>
                
                <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-6">
                  {option.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-center">
                      <CheckCircle2 className="h-3 w-3 lg:h-4 lg:w-4 text-primary mr-2 shrink-0" />
                      <span className="text-xs lg:text-sm text-gray-600 font-light">{highlight}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-100 pt-3 lg:pt-6 mt-auto">
                  <p className="text-sm lg:text-lg font-medium text-primary mb-3 lg:mb-4">{option.price}</p>
                  <Button 
                    variant={null}
                    className={`w-full h-7 sm:h-8 lg:h-10 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg lg:rounded-xl font-medium transition-all duration-300 inline-flex items-center justify-center text-xs lg:text-sm ${
                      option.popular 
                        ?  'text-gold border border-gold hover:bg-gold hover:text-white' 
                        : 'bg-white text-primary border border-primary hover:bg-primary hover:text-white'
                    }`}
                    asChild
                  >
                    <Link href="/boats/search">
                      {index === 2 ? 'Contact Us' : 'Book Now'}
                    </Link>
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