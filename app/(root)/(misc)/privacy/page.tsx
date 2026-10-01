import React from 'react'
import Link from 'next/link'

import { Mail, Phone, Globe, Shield, Eye, Lock, Users, MessageCircle } from 'lucide-react'

// Force static generation - this policy page has no dynamic content
export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="py-10 md:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-primary font-medium text-sm tracking-wide uppercase mb-2 block">
            Privacy Policy
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-primary leading-tight">
            Your Privacy Matters
          </h1>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            
            {/* Introduction */}
            <div className="p-8 border-b border-gray-200">
              <p className="text-gray-600 leading-relaxed font-light">
                Kings of the Sea Management LLC (&quot;KOS Yachts,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. 
                This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you interact 
                with our website, services, and communications.
              </p>
            </div>

            {/* Section 1: Information We Collect */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">1. Information We Collect</h2>
              </div>
              
              <p className="text-gray-600 mb-6 font-light">
                We collect the following types of information:
              </p>
              
              <div className="bg-primary/5 rounded-lg p-4 mb-6">
                <p className="text-primary font-medium text-sm">
                  Important: No mobile opt-in data will be shared with any third parties.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">a. Personal Information</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    When you engage with our services, book a yacht, or communicate with us, we may collect:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Name, phone number, email address, and mailing address",
                      "Payment and billing information",
                      "Government-issued ID (for verification purposes)",
                      "Preferences and special requests related to your bookings"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">b. Automatically Collected Information</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    We may collect data through cookies, log files, and tracking technologies, including:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "IP address and device type",
                      "Browsing activity on our website",
                      "Interaction with emails and messages"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">c. Communication Data</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    If you opt-in to receive messages, we collect and store:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "SMS and email correspondence",
                      "Preferences for receiving marketing and service updates"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 2: How We Use Your Information */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">2. How We Use Your Information</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">We use your information to:</p>
              
              <ul className="space-y-3">
                {[
                  "Process and manage bookings",
                  "Provide customer support and respond to inquiries",
                  "Improve our website, services, and customer experience",
                  "Send promotional offers and updates (with your consent)",
                  "Comply with legal obligations and prevent fraud"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: How We Share Your Information */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">3. How We Share Your Information</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">
                We do not sell or rent your information. However, we may share it with:
              </p>
              
              <ul className="space-y-3">
                {[
                  "Service Providers: Payment processors, yacht crew, and customer support providers",
                  "Legal Authorities: If required by law or to protect our rights",
                  "Marketing Partners: Only with consent for promotional campaigns"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 4: Data Security */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">4. Data Security</h2>
              </div>
              
              <p className="text-gray-600 font-light">
                We implement industry-standard security measures to protect your data. However, no online transmission 
                is 100% secure. Please take precautions when sharing personal information.
              </p>
            </div>

            {/* Section 5: Your Rights & Choices */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">5. Your Rights & Choices</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">You can:</p>
              
              <ul className="space-y-3">
                {[
                  "Opt out of marketing messages by replying STOP to SMS or clicking \"Unsubscribe\" in emails",
                  "Request access, updates, or deletion of your personal data by contacting us",
                  "Manage cookies through your browser settings"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 6: Message Compliance & Consent */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">6. Message Compliance & Consent</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">
                By opting in, you agree to receive messages from Kings of the Sea Management LLC:
              </p>
              
              <ul className="space-y-3">
                {[
                  "Message frequency varies. Message and data rates may apply",
                  "For help, reply HELP. To unsubscribe, reply STOP"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 7: Changes to This Policy */}
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-2xl font-medium text-primary mb-4">7. Changes to This Policy</h2>
              <p className="text-gray-600 font-light">
                We may update this policy periodically. Any changes will be posted on our website with an updated effective date.
              </p>
            </div>

            {/* Section 8: Contact Us */}
            <div className="p-8">
              <h2 className="text-2xl font-medium text-primary mb-6">8. Contact Us</h2>
              <p className="text-gray-600 mb-6 font-light">
                For questions or concerns, contact us at:
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Email</p>
                    <Link href="mailto:contact@kosyachts.com" className="text-gray-600 hover:text-primary transition-colors">
                      contact@kosyachts.com
                    </Link>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Phone</p>
                    <Link href="tel:3055218877" className="text-gray-600 hover:text-primary transition-colors">
                      (305) 521-8877
                    </Link>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Globe className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Website</p>
                    <Link href="/" className="text-gray-600 hover:text-primary transition-colors">
                      kosyachts.com
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
