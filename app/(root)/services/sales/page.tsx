import { Metadata } from 'next'
import { ServicePageTemplate } from '@/features/_marketing/services/components'

export const metadata: Metadata = {
  title: 'Boat & Yacht Sales | KOS',
  description: 'Professional boat and yacht sales and purchase services with industry experts to guide you through every step.',
}

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static';

export default function SalesPage() {
  return (
    <ServicePageTemplate 
      title="Yacht & Boat Sales"
      subtitle="Sales Services"
      description="Expert guidance for buying or selling your vessel with professional representation at every step."
      heroImage="/images/services/yacht-sales.jpg"
      secondaryImage="/images/services/sales.webp"
      features={[
        {
          title: "Vessel Valuation",
          description: "Professional market analysis and appraisal to determine the optimal listing price or offer for your boat or yacht."
        },
        {
          title: "Global Marketing",
          description: "Comprehensive marketing strategies including high-quality photography, virtual tours, and listings on premium platforms."
        },
        {
          title: "Buyer Representation",
          description: "Expert guidance for buyers including vessel search, market analysis, survey coordination, and negotiation support."
        },
        {
          title: "Seller Representation",
          description: "Full-service seller support including marketing strategy, qualified buyer screening, and negotiation assistance."
        },
        {
          title: "Transaction Management",
          description: "Complete handling of all paperwork, surveys, sea trials, and closing procedures for a smooth transaction."
        }
      ]}
      stats={[
        { value: "50+", label: "Transactions" },
        { value: "10+ Years", label: "Industry Experience" },
        { value: "45", label: "Days Avg. Time to Sale" }
      ]}
      steps={[
        {
          title: "Initial Consultation",
          description: "Understanding your specific buying or selling goals and developing a customized strategy."
        },
        {
          title: "Market Analysis",
          description: "Comprehensive market research and vessel valuation to establish optimal pricing strategies."
        },
        {
          title: "Professional Marketing",
          description: "High-quality photography, detailed listings, and strategic marketing across premium platforms."
        },
        {
          title: "Qualified Lead Management",
          description: "Screening and qualifying potential buyers or sourcing ideal vessels for buyers."
        },
        {
          title: "Negotiation & Offers",
          description: "Expert negotiation to secure the best possible terms and price for all parties."
        },
        {
          title: "Transaction Completion",
          description: "Managing all documentation, surveys, sea trials, and closing procedures seamlessly."
        }
      ]}
      faqItems={[
        {
          question: "How long does it typically take to sell a vessel?",
          answer: "While market conditions vary, our professionally marketed vessels sell in 45 days on average, compared to the industry average of 90+ days."
        },
        {
          question: "Do you handle international sales and purchases?",
          answer: "Yes, we have extensive experience with international transactions and can manage all aspects including import/export regulations, foreign documentation, and currency exchanges."
        },
        {
          question: "What makes KOS different from other brokers?",
          answer: "Our combination of extensive market knowledge, premium marketing strategies, global network of qualified buyers, and full-service approach results in faster sales at better prices."
        },
        {
          question: "Do you help with financing for boat purchases?",
          answer: "Absolutely. We partner with several marine lending specialists who offer competitive rates and can guide you through the marine financing process."
        }
      ]}
    />
  )
} 