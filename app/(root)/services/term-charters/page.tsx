import { Metadata } from 'next'
import { ServicePageTemplate } from '@/features/_marketing/services/components'

export const metadata: Metadata = {
  title: 'Charter Your Yacht With Kings of The Sea',
  description: 'Partner with KOS to charter your yacht and generate revenue from your vessel with professional management and marketing.',
}

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static';

export default function TermChartersPage() {
  return (
    <ServicePageTemplate 
      title="Charter Your Yacht"
      subtitle="Owner Partnership Program"
      description="Turn your yacht into a profitable asset. Partner with KOS to charter your vessel and earn revenue while we handle everything from marketing to guest services."
      heroImage="/images/services/term-charter.png"
      secondaryImage="/images/services/term-charter2.jpg"
      features={[
        {
          title: "Revenue Generation",
          description: "Transform your yacht from an expense into a revenue-generating asset with our professional charter management and marketing expertise."
        },
        {
          title: "Complete Management",
          description: "We handle everything from guest services and cleaning to maintenance coordination, so you can enjoy passive income without the hassle."
        },
        {
          title: "Professional Marketing",
          description: "Your yacht gets featured on our premium platform with professional photography and targeted marketing to attract high-quality charter guests."
        },
        {
          title: "Vessel Protection",
          description: "Comprehensive insurance coverage and vetted guests ensure your yacht is protected while generating income for you."
        },
        {
          title: "Owner Flexibility",
          description: "Reserve your yacht for personal use anytime with advance notice - earn money when you're not using it, enjoy it when you want to."
        }
      ]}
      stats={[
        { value: "200+", label: "Partner Yachts" },
        { value: "98%", label: "Owner Satisfaction" },
        { value: "30%", label: "Average Annual ROI" }
      ]}
      steps={[
        {
          title: "Initial Assessment",
          description: "We evaluate your yacht's charter potential, market positioning, and revenue opportunities in your area."
        },
        {
          title: "Partnership Agreement",
          description: "Establish transparent terms, commission structure, and partnership details tailored to your vessel and goals."
        },
        {
          title: "Marketing Launch",
          description: "Professional photography, listing creation, and multi-platform marketing to showcase your yacht to potential guests."
        },
        {
          title: "Guest Management",
          description: "We handle all bookings, guest communications, check-ins, and customer service throughout each charter."
        },
        {
          title: "Charter Operations",
          description: "Complete management of each charter including provisioning, crew coordination, and guest experience delivery."
        },
        {
          title: "Revenue & Reporting",
          description: "Regular financial reporting and prompt payment of your earnings with transparent tracking of all charter activity."
        }
      ]}
      faqItems={[
        {
          question: "How much can I earn from chartering my yacht?",
          answer: "Earnings vary based on yacht size, location, season, and demand. Our partner owners typically see 20-40% annual returns on their investment. We'll provide a detailed revenue projection during your initial consultation based on your specific yacht and market."
        },
        {
          question: "Can I still use my yacht for personal trips?",
          answer: "Absolutely! You can reserve your yacht for personal use anytime with advance notice. Many owners use their yacht 2-3 months per year and charter it the rest of the time to offset ownership costs while generating profit."
        },
        {
          question: "What is KOS's commission and fee structure?",
          answer: "Our commission structure is competitive and transparent, typically ranging from 15-30% depending on services included. We provide a detailed breakdown of all fees upfront with no hidden costs. You'll know exactly what you earn from each charter."
        },
        {
          question: "Who is responsible for maintenance and repairs?",
          answer: "We coordinate all routine maintenance between charters to keep your yacht in pristine condition. Major repairs are discussed with you first, and we have preferred vendors offering competitive rates. This actually helps maintain your yacht better than personal use alone."
        },
        {
          question: "What type of insurance is required?",
          answer: "We require comprehensive charter insurance which we can help arrange. This protects both you and your guests, and often costs less than you'd expect. We work with marine insurance specialists to get competitive rates."
        }
      ]}
    />
  )
} 