import { Metadata } from 'next'
import { ServicePageTemplate } from '@/features/_marketing/services/components'

export const metadata: Metadata = {
  title: 'Dock Management Services | KOS',
  description: 'Professional dock and marina management services for property owners and associations.',
}

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static';

export default function DockManagementPage() {
  return (
    <ServicePageTemplate 
      title="Dock Management"
      subtitle="Property Services"
      description="Professional management services for private docks, marinas, and waterfront properties."
      heroImage="/images/services/dock-management.jpg"
      secondaryImage="/images/boats/aerial4.jpg"
      features={[
        {
          title: "Infrastructure Maintenance",
          description: "Regular inspection and maintenance of docks, pilings, electrical systems, and water connections to ensure safety and functionality."
        },
        {
          title: "Access Control",
          description: "Secure access management systems including key cards, security cameras, and gate monitoring for authorized entry only."
        },
        {
          title: "Tenant Management",
          description: "Complete handling of slip rentals, contracts, billing, and tenant communication for marina property owners."
        },
        {
          title: "Emergency Response",
          description: "24/7 monitoring and rapid response protocols for weather events, security incidents, and vessel emergencies."
        },
        {
          title: "Environmental Compliance",
          description: "Ensuring all operations meet environmental regulations with proper waste management and pollution prevention measures."
        }
      ]}
      steps={[
        {
          title: "Property Assessment",
          description: "Comprehensive evaluation of dock infrastructure, systems, and current management needs."
        },
        {
          title: "Management Plan",
          description: "Development of customized management strategy including maintenance schedules and operational procedures."
        },
        {
          title: "System Implementation",
          description: "Installation of access control, monitoring systems, and establishment of management protocols."
        },
        {
          title: "Tenant Onboarding",
          description: "Transition of existing tenants and implementation of new rental and communication systems."
        },
        {
          title: "Daily Operations",
          description: "Ongoing management including maintenance, security, billing, and tenant services."
        },
        {
          title: "Performance Monitoring",
          description: "Regular reporting on occupancy, revenue, maintenance activities, and property performance metrics."
        }
      ]}
      faqItems={[
        {
          question: "What size properties do you manage?",
          answer: "We manage everything from private residential docks to large commercial marinas with hundreds of slips. Our services scale to meet the specific needs of each property."
        },
        {
          question: "How do you handle slip rentals and tenant management?",
          answer: "We handle the entire process from marketing vacancies and screening potential tenants to contract management, billing, collections, and ongoing communication."
        },
        {
          question: "What maintenance services are included?",
          answer: "Our standard maintenance includes regular inspections, cleaning, electrical system checks, plumbing maintenance, structural evaluations, and immediate response to any reported issues."
        },
        {
          question: "Do you provide security for the properties?",
          answer: "Yes, we implement comprehensive security measures including access control systems, surveillance cameras, regular security patrols, and emergency response protocols."
        }
      ]}
    />
  )
} 