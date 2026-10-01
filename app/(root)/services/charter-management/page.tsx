import { Metadata } from 'next'
import { ServicePageTemplate } from '@/features/_marketing/services/components'

export const metadata: Metadata = {
  title: 'Charter Management Services | KOS',
  description: 'Professional charter management services for boat and yacht owners looking to maximize their investment.',
}

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static';

export default function CharterManagementPage() {
  return (
    <ServicePageTemplate 
      title="Charter Management"
      subtitle="Owner Services"
      description="Turn your vessel into a revenue-generating asset with our comprehensive charter management services."
      heroImage="/images/services/charter-management2.jpg"
      secondaryImage="/images/services/charter-management.jpg"
      features={[
        {
          title: "Revenue Optimization",
          description: "Our marketing strategies and dynamic pricing algorithms help maximize your charter bookings and revenue throughout the year."
        },
        {
          title: "Complete Vessel Care",
          description: "We handle all maintenance, cleaning, and repairs to keep your boat in pristine condition between charters."
        },
        {
          title: "Booking Management",
          description: "We handle all the reservations, customer service, and logistics so you don't have to worry about the details."
        },
        {
          title: "Financial Reporting",
          description: "Access detailed financial reports and analytics to track your vessel's performance and revenue."
        },
        {
          title: "Insurance & Compliance",
          description: "We ensure all necessary permits, licenses, and insurance requirements are maintained for legal charter operations."
        }
      ]}
      stats={[
        { value: "200+", label: "Managed Vessels" },
        { value: "98%", label: "Owner Satisfaction" },
        { value: "2000+", label: "Successful Charters" }
      ]}
      steps={[
        {
          title: "Vessel Assessment",
          description: "Comprehensive evaluation of your vessel's charter potential and market positioning."
        },
        {
          title: "Marketing Launch",
          description: "Professional photography, listing creation, and multi-platform marketing deployment."
        },
        {
          title: "Booking Management",
          description: "Automated booking system with real-time availability and instant confirmations."
        },
        {
          title: "Guest Services",
          description: "Complete guest experience management from check-in to departure."
        },
        {
          title: "Maintenance Coordination",
          description: "Scheduled maintenance and repairs between charters to maintain vessel condition."
        },
        {
          title: "Financial Reporting",
          description: "Monthly revenue reports and performance analytics for transparent tracking."
        }
      ]}
      faqItems={[
        {
          question: "How much revenue can I expect?",
          answer: "While revenue varies based on vessel type, size, location, and season, our owners typically see 15-40% more revenue compared to self-management or other services."
        },
        {
          question: "Do I still get to use my own boat?",
          answer: "Absolutely! Owners can reserve their vessels for personal use anytime with advance notice. We work around your schedule to maximize both your enjoyment and charter revenue."
        },
        {
          question: "Who handles maintenance and repairs?",
          answer: "Our team manages all routine maintenance and coordinates any necessary repairs with trusted service providers. We handle the logistics so you don't have to."
        },
        {
          question: "What percentage does KOS take?",
          answer: "Our commission structure is competitive and transparent. We are flexible and work closely with each customer to tailor our services according to their needs and boat specifications. We'll provide a detailed breakdown during your consultation."
        }
      ]}
    />
  )
} 