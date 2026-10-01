import React from "react";
import Link from "next/link";

import { Mail, Phone, Globe, Shield, FileText, Anchor, Users, CreditCard, MessageCircle, AlertTriangle, Gavel } from "lucide-react";

// Force static generation - this policy page has no dynamic content
export const dynamic = "force-static";

export default function TermsOfServicePage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="py-10 md:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-primary font-medium text-sm tracking-wide uppercase mb-2 block">
            Terms & Conditions
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-primary leading-tight">
            Terms of Service
          </h1>
        </div>
      </section>

      {/* Terms Content */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Introduction */}
            <div className="p-8 border-b border-gray-200">
              <div className="bg-primary/5 rounded-lg p-4 mb-6">
                <p className="text-primary font-medium text-sm">
                  Effective Date: 5/22/25
                </p>
              </div>
              <p className="text-gray-600 leading-relaxed font-light">
                Welcome to Kings of the Sea Management LLC (&quot;KOS Yachts&quot;, &quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;). By using our website, booking services, or
                engaging with our communications, you agree to the following
                Terms and Conditions. Please read them carefully before
                proceeding.
              </p>
            </div>

            {/* Section 1: Acceptance of Terms */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  1. Acceptance of Terms
                </h2>
              </div>

              <p className="text-gray-600 font-light">
                By accessing or using our services, you acknowledge that you
                have read, understood, and agreed to these Terms. If you do not
                agree, please refrain from using our services.
              </p>
            </div>

            {/* Section 2: Services Provided */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Anchor className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  2. Services Provided
                </h2>
              </div>

              <p className="text-gray-600 mb-4 font-light">
                KOS Yachts offers luxury yacht charters and management services,
                including but not limited to:
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  "Private yacht rentals and term charters",
                  "Crew and yacht operations management",
                  "Onboard events and experiences",
                  "Concierge and lifestyle coordination",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-gray-600 font-light">
                All services are subject to vessel availability, crew
                scheduling, and client compliance with our policies.
              </p>
            </div>

            {/* Section 3: Booking and Payment Terms */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  3. Booking and Payment Terms
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    a. Reservations & Deposits
                  </h3>
                  <ul className="space-y-2">
                    {[
                      "A 50% deposit is required to secure your booking",
                      "Full payment is due at least 24 hours before charter departure",
                      "Bookings are only confirmed once full payment is received and processed",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-primary mb-3">
                    b. Cancellations & Refunds
                  </h3>
                  <p className="text-gray-600 mb-4 font-light">
                    Unless otherwise noted in your vessel-specific agreement:
                  </p>
                  <p className="text-gray-600 font-light">
                    We will always work with you to find a solution. This
                    includes but is not limited to: bad weather, safety
                    concerns, general cancellations, or other unforeseen
                    circumstances. Please contact us at{" "}
                    <Link
                      href="mailto:contact@kosyachts.com"
                      className="text-primary hover:text-primary/80 transition-colors underline font-bold"
                    >
                      contact@kosyachts.com
                    </Link>{" "}
                    or{" "}
                    <Link
                      href="tel:+13055218877"
                      className="text-primary hover:text-primary/80 transition-colors underline font-bold"
                    >
                      (305) 521-8877
                    </Link>{" "}
                    as soon as possible to discuss your situation.
                  </p>

                  <ul className="space-y-2">
                    {[
                      "Unsafe Conditions (e.g., lightning, high winds, pandemics): We will work with your group to reschedule or issue a refund, at our discretion",
                      "Unfavorable Conditions (e.g., light rain, cloudy skies): Most charters will proceed as scheduled",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="bg-primary/5 rounded-lg p-4 mt-4">
                    <p className="text-primary font-medium text-sm">
                      Note: Our team is committed to working with every client
                      fairly and flexibly. Communication is key—please contact
                      us as early as possible to make adjustments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Passenger Conduct & Safety */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  4. Passenger Conduct & Safety
                </h2>
              </div>

              <p className="text-gray-600 mb-4 font-light">
                To ensure a premium and safe experience for all, guests must
                comply with the following:
              </p>

              <ul className="space-y-3">
                {[
                  "Follow all crew and captain instructions at all times",
                  "No illegal substances or excessive alcohol consumption",
                  "Smoking only in permitted areas (subject to captain approval)",
                  "Treat crew, vessel, and equipment respectfully",
                  "Any damage or misconduct may result in termination without refund",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 5: Liability & Indemnity */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  5. Liability & Indemnity
                </h2>
              </div>

              <ul className="space-y-3">
                {[
                  "KOS Yachts is not responsible for personal injury, lost belongings, or damages caused by guests",
                  "Guests assume full responsibility for their conduct and actions",
                  "You agree to indemnify and hold harmless KOS Yachts and its affiliates from any claims, liabilities, or damages arising from your use of the services",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 6: Privacy & Communication Consent */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  6. Privacy & Communication Consent
                </h2>
              </div>

              <p className="text-gray-600 mb-4 font-light">
                By booking with us, you agree to receive essential updates by
                SMS, email, or phone. We do not sell or misuse personal data.
              </p>

              <p className="text-gray-600 font-light">
                Refer to our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{" "}
                for full details on how we collect and manage your information.
              </p>
            </div>

            {/* Section 7: SMS Terms & Conditions */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  7. SMS Terms & Conditions
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    1. SMS Consent Communication
                  </h3>
                  <p className="text-gray-600 font-light">
                    Any personal information, including phone numbers, obtained
                    as part of the SMS consent process will not be shared with
                    third parties for marketing purposes.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    2. Types of SMS Communications
                  </h3>
                  <p className="text-gray-600 mb-3 font-light">
                    If you have consented to receive text messages from KOS
                    Yachts, you may receive messages related to the following:
                  </p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Appointment or charter reminders",
                      "Follow-up messages and customer service updates",
                      "Billing inquiries and confirmations",
                      "Promotions, offers, or service alerts (if applicable)",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-primary mb-2">
                      Example Message:
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      &quot;Hello, this is a friendly reminder of your upcoming
                      charter with KOS Yachts on [Date] at [Time]. Reply STOP to
                      opt out of SMS messaging at any time.&quot;
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    3. Message Frequency
                  </h3>
                  <p className="text-gray-600 font-light">
                    Message frequency may vary depending on your engagement with
                    our services and your communication preferences.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    4. Potential Fees for SMS Messaging
                  </h3>
                  <p className="text-gray-600 font-light">
                    Standard message and data rates may apply depending on your
                    carrier&apos;s pricing plan. Charges may vary for domestic vs.
                    international messages.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    5. Opt-In Method
                  </h3>
                  <p className="text-gray-600 mb-3 font-light">
                    You may opt-in to receive SMS messages from KOS Yachts
                    through the following methods:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Verbally, during a conversation with our team",
                      "By submitting an online booking or inquiry form",
                      "By filling out a paper form at one of our events or offices",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">
                    6. Opt-Out Method
                  </h3>
                  <p className="text-gray-600 mb-3 font-light">
                    You may opt out of receiving SMS messages at any time:
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Reply "STOP" to any text message',
                      "Contact us directly via email or phone to request removal from our SMS list",
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

            {/* Section 8: Force Majeure */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  8. Force Majeure
                </h2>
              </div>

              <p className="text-gray-600 font-light">
                We are not liable for service interruptions due to weather
                events, mechanical failures, government orders, pandemics, or
                other force majeure events beyond our control.
              </p>
            </div>

            {/* Section 9: Modifications to Terms */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Gavel className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">
                  9. Modifications to Terms
                </h2>
              </div>

              <p className="text-gray-600 font-light">
                We reserve the right to revise these Terms at any time. Updates
                will be posted on our website. Continued use of our services
                signifies acceptance of any changes.
              </p>
            </div>

            {/* Section 10: Contact Us */}
            <div className="p-8">
              <h2 className="text-2xl font-medium text-primary mb-6">
                10. Contact Us
              </h2>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Email</p>
                    <Link
                      href="mailto:contact@kosyachts.com"
                      className="text-gray-600 hover:text-primary transition-colors"
                    >
                      contact@kosyachts.com
                    </Link>
                  </div>
                </div>

                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Phone</p>
                    <Link
                      href="tel:3055218877"
                      className="text-gray-600 hover:text-primary transition-colors"
                    >
                      305-521-8877
                    </Link>
                  </div>
                </div>

                <div className="flex items-center">
                  <Globe className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Website</p>
                    <Link
                      href="/"
                      className="text-gray-600 hover:text-primary transition-colors"
                    >
                      www.kosyachts.com
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
