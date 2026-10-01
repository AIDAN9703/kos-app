import { Metadata } from 'next'
import { ServicePageTemplate } from '@/features/_marketing/services/components'

export const metadata: Metadata = {
  title: 'Yacht Management Services | KOS',
  description: 'Professional yacht management services to protect and maintain your luxury vessel investment.',
}

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static';

export default function YachtManagementPage() {
  return (
    <ServicePageTemplate 
      title="Yacht Management"
      subtitle="Owner Services"
      description="Comprehensive yacht management solutions for owners seeking peace of mind and pristine vessel condition."
      heroImage="/images/services/yacht-management.jpg"
      secondaryImage="/images/services/yacht-management2.jpg"
      features={[
        {
          title: "Crew Management",
          description: "Professional recruitment, training, and management of qualified crew members tailored to your yacht's requirements."
        },
        {
          title: "Technical Management",
          description: "Regular maintenance, inspections, and repairs performed by certified technicians to ensure your yacht operates at peak performance."
        },
        {
          title: "Financial Administration",
          description: "Comprehensive financial management including budget planning, expense tracking, and detailed financial reporting."
        },
        {
          title: "Compliance & Documentation",
          description: "Handling all regulatory compliance, registrations, certifications, and permits required for your vessel."
        },
        {
          title: "Owner Representation",
          description: "Acting as your representative during maintenance, repairs, and inspections to ensure your interests are protected."
        }
      ]}
      stats={[
        { value: "20+", label: "Luxury Yachts Managed" },
        { value: "24/7", label: "Support" },
        { value: "20%", label: "Maintenance Cost Savings" }
      ]}
      steps={[
        {
          title: "Initial Assessment",
          description: "Comprehensive evaluation of your yacht's condition, systems, and management requirements."
        },
        {
          title: "Custom Management Plan",
          description: "Development of tailored management strategy based on your specific needs and preferences."
        },
        {
          title: "Crew Recruitment",
          description: "Professional sourcing and placement of qualified crew members for your vessel."
        },
        {
          title: "System Implementation",
          description: "Setup of maintenance schedules, financial tracking, and communication protocols."
        },
        {
          title: "Ongoing Management",
          description: "Day-to-day management including maintenance, crew oversight, and administrative tasks."
        },
        {
          title: "Regular Reporting",
          description: "Monthly updates on vessel condition, expenses, and recommendations for optimal performance."
        }
      ]}
      faqItems={[
        {
          question: "What size yachts do you manage?",
          answer: "We manage yachts ranging from 40 feet to 200+ feet. Our services are scaled and customized based on vessel size and complexity."
        },
        {
          question: "Do you provide crew training?",
          answer: "Yes, we provide comprehensive crew recruitment, placement, and ongoing training to ensure your crew maintains the highest standards of service and safety."
        },
        {
          question: "Can you manage yachts in international waters?",
          answer: "Absolutely. Our global network allows us to manage vessels worldwide, handling international regulations, documentation, and local requirements wherever your yacht travels."
        },
        {
          question: "How often will I receive reports on my yacht?",
          answer: "We provide monthly financial and maintenance reports as standard, with emergency notifications as needed. We can customize reporting frequency and detail to your preferences."
        }
      ]}
    />
  )
} 