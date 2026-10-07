import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { ArrowRight, Mail, Phone, MessageCircle } from 'lucide-react'

// Force static generation - this FAQ page has no dynamic content
export const dynamic = 'force-static';

const faqItems = [
  {
    question: "Why KOS Yachts?",
    answer: "KOS Yachts combines luxury service with operational excellence. We're not just a charter company—we're a full-service yacht management firm that handles every detail, from bookings to maintenance, with care and professionalism."
  },
  {
    question: "How does the process work?",
    answer: "steps"
  },
  {
    question: "What do your yachts/boats include?",
    answer: "All of our yacht/boat packages include the vessel, crew, ice and water. Every package is either all in (the price on the site is all inclusive) or plus gratuity (gratuity is additional and is paid to the crew directly). Please make sure to read the description of each."
  },
  {
    question: "Can we take more than 13 people?",
    answer: "For most charters, the Coast Guard only allows a maximum of 13 passengers in your party. There are two ways to have more than 13 people on the water: 1) Get 1 boat with larger capacity - usually a pontoon, catamaran, or large yacht 2) Get 2 vessels and tie them together when safely anchored."
  },
  {
    question: "Can we pay with a credit card?",
    answer: "Yes, we have the ability to accept payment via credit card. We accept all major credit cards including Visa, Mastercard, American Express, and Discover."
  },
  {
    question: "Do your boats have safety equipment?",
    answer: "Yes, all of our vessels are Coast Guard compliant with all safety equipment and legal documents. Safety is our top priority and we maintain the highest standards."
  },
  {
    question: "Is a captain included?",
    answer: "In accordance with Coast Guard Regulations our team will provide a list of possible crew for your charter prior to onboarding. All our captains are licensed and experienced professionals."
  },
  {
    question: "Can we do a multi-day trip?",
    answer: "Absolutely! We can help find any boat for any budget or time duration! Whether you're looking for a weekend getaway or an extended luxury charter, we have options to suit your needs."
  },
  {
    question: "What is your cancellation policy?",
    answer: "Unsafe conditions (high winds, lightning, pandemic, etc) we will work with your group to reschedule or refund. Unfavorable conditions (cloudy, light rain, etc) most charters will take place. Our team will always work with you!"
  },
  {
    question: "What is the booking process timeline?",
    answer: "We recommend booking at least 2-3 weeks in advance for peak season (holidays and summer months). However, we can often accommodate last-minute bookings subject to availability."
  },
  {
    question: "Do you provide catering services?",
    answer: "We can arrange catering services through our preferred partners. Options range from casual snacks and beverages to full gourmet dining experiences. Please discuss your preferences with our team during booking."
  },
  {
    question: "What happens in case of bad weather?",
    answer: "Safety is our priority. If weather conditions are deemed unsafe by our captain or Coast Guard, we will work with you to reschedule your charter for another date or provide a full refund as per our weather policy."
  }
]

export default function FAQPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="py-20 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-primary font-medium text-sm tracking-wide uppercase mb-4 block">
            Frequently Asked Questions
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-6 text-primary leading-tight">
            Everything You Need to Know
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed font-light">
            Find answers to the most common questions about our yacht charter services. 
            Can&apos;t find what you&apos;re looking for? Our team is here to help.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details 
                key={index} 
                className="group bg-white rounded-lg border border-gray-200 hover:shadow-xs transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <summary className="flex items-center justify-between cursor-pointer p-6">
                  <h3 className="text-xl font-medium text-primary pr-4">{item.question}</h3>
                  <span className="ml-6 shrink-0 text-primary/60 group-open:rotate-180 transition-transform">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed font-light">
                  {item.answer === "steps" ? (
                    <div className="space-y-4">
                      <div>
                        <div className="font-medium text-primary mb-2">1. Choose Your Yacht</div>
                        <div>Browse our fleet or tell us what you&apos;re looking for—we&apos;ll help you find the perfect fit for your occasion, group size, and budget.</div>
                      </div>
                      <div>
                        <div className="font-medium text-primary mb-2">2. Customize & Confirm</div>
                        <div>Work with our team to tailor your experience. Once details are set, you&apos;ll receive a quote and secure your date with a deposit.</div>
                      </div>
                      <div>
                        <div className="font-medium text-primary mb-2">3. Sail & Enjoy</div>
                        <div>We&apos;ll send all trip info 48 hours prior. Show up, step aboard, and enjoy a seamless luxury experience—our crew handles the rest.</div>
                      </div>
                    </div>
                  ) : (
                    item.answer
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-primary/5 rounded-2xl p-8 md:p-12">
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-medium mb-4 text-primary">
              Still Have Questions?
            </h2>
            <p className="text-gray-600 mb-8 text-lg font-light max-w-2xl mx-auto">
              Our experienced team is here to help you plan the perfect yacht charter experience. 
              Get in touch and we&apos;ll respond within 24 hours.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/contact">
                <Button className="bg-primary text-white hover:bg-primary/90 px-8 py-3 font-medium">
                  Contact Us
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="mailto:contact@kosyachts.com">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 font-medium">
                  <Mail className="mr-2 h-5 w-5" />
                  Email Us
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-600 font-light">
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-primary" />
                <span>contact@kosyachts.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-primary" />
                <span>+1 (305) 521-8877</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
