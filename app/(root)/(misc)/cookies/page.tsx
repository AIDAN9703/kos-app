import React from 'react'
import Link from 'next/link'

import { Mail, Phone, Globe, Cookie, Settings, Eye, Users, Calendar, Monitor } from 'lucide-react';

// Force static generation - this policy page has no dynamic content
export const dynamic = 'force-static';

export default function CookiesPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="py-10 md:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-primary font-medium text-sm tracking-wide uppercase mb-2 block">
            Cookies Policy
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-primary leading-tight">
            How We Use Cookies
          </h1>
        </div>
      </section>

      {/* Cookies Content */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            
            {/* Introduction */}
            <div className="p-8 border-b border-gray-200">
              <div className="bg-primary/5 rounded-lg p-4 mb-6">
                <p className="text-primary font-medium text-sm">
                  Last Updated: 5/22/25
                </p>
              </div>
              <p className="text-gray-600 leading-relaxed font-light">
                Kings of the Sea Management LLC (&quot;KOS Yachts&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar tracking 
                technologies on our website to enhance your browsing experience, analyze website traffic, and provide 
                personalized content. This Cookies Policy explains what cookies are, how we use them, and your choices 
                regarding their use.
              </p>
            </div>

            {/* Section 1: What Are Cookies */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Cookie className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">1. What Are Cookies?</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">
                Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you 
                visit our website. They help us recognize your device and remember information about your visit, such as 
                your preferred settings and previous activity.
              </p>
              
              <p className="text-gray-600 font-light">
                Cookies improve your browsing experience by enabling features like remembering your preferences, 
                keeping you logged in, and providing relevant content recommendations.
              </p>
            </div>

            {/* Section 2: How We Use Cookies */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">2. How We Use Cookies</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">We use cookies for several purposes:</p>
              
              <ul className="space-y-3">
                {[
                  "Essential functionality: Enable core website features and secure access",
                  "Performance analytics: Understand how visitors interact with our website",
                  "Personalization: Remember your preferences and provide tailored content",
                  "Marketing optimization: Deliver relevant advertisements and measure campaign effectiveness",
                  "User experience: Improve website navigation and booking processes",
                  "Security: Protect against fraud and ensure secure transactions"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: Types of Cookies We Use */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">3. Types of Cookies We Use</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Essential Cookies</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    These cookies are necessary for the website to function properly and cannot be disabled.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm">
                      {[
                        "Session management and user authentication",
                        "Shopping cart and booking form functionality",
                        "Security and fraud prevention",
                        "Load balancing and website performance"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-2 shrink-0" />
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Analytics Cookies</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    These cookies help us understand how visitors use our website so we can improve it.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm">
                      {[
                        "Google Analytics: Website traffic and user behavior analysis",
                        "Page view tracking and popular content identification",
                        "User journey mapping and conversion tracking",
                        "Error monitoring and performance optimization"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-2 shrink-0" />
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Functional Cookies</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    These cookies enable enhanced functionality and personalization features.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm">
                      {[
                        "Language and location preferences",
                        "Remembered search filters and favorite yachts",
                        "Live chat and customer support features",
                        "Social media integration and sharing"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-2 shrink-0" />
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Marketing Cookies</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    These cookies track your activity to deliver relevant advertisements and measure campaign performance.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm">
                      {[
                        "Facebook Pixel and Google Ads conversion tracking",
                        "Retargeting and remarketing campaigns",
                        "Email marketing optimization",
                        "Cross-device user identification"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-2 shrink-0" />
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Third-Party Cookies */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">4. Third-Party Cookies</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">
                Some cookies on our website are set by third-party services that we use to enhance functionality 
                and analyze performance. These partners may use the information for their own purposes.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-medium text-primary mb-3">Our Third-Party Partners Include:</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Analytics & Performance</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Google Analytics</li>
                        <li>• Google Tag Manager</li>
                        <li>• Hotjar (heatmaps)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Marketing & Advertising</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Facebook Pixel</li>
                        <li>• Google Ads</li>
                        <li>• Email marketing platforms</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mt-4 font-light">
                These third parties have their own privacy policies governing their use of information. 
                We encourage you to review their policies for more details.
              </p>
            </div>

            {/* Section 5: Managing Your Cookie Preferences */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">5. Managing Your Cookie Preferences</h2>
              </div>
              
              <p className="text-gray-600 mb-6 font-light">
                You have several options for managing cookies on our website:
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Browser Settings</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    Most web browsers allow you to control cookies through their settings:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Block all cookies or only third-party cookies",
                      "Delete existing cookies from your device",
                      "Set your browser to notify you when cookies are sent",
                      "Browse in private/incognito mode to avoid storing cookies"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Cookie Banner</h3>
                  <p className="text-gray-600 font-light">
                    When you first visit our website, you&apos;ll see a cookie banner where you can accept or decline 
                    non-essential cookies. You can change your preferences at any time by clicking the cookie 
                    settings link in our website footer.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Opt-Out Links</h3>
                  <p className="text-gray-600 mb-3 font-light">
                    You can opt out of certain third-party tracking:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Google Analytics: Use Google's opt-out browser add-on",
                      "Google Ads: Visit Google's Ads Settings page",
                      "Facebook: Adjust your Facebook Ad Preferences",
                      "Industry opt-out: Visit youronlinechoices.eu or optout.aboutads.info"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                        <span className="text-gray-600 font-light">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-primary font-medium text-sm">
                    Important: Disabling certain cookies may affect website functionality and your user experience. 
                    Essential cookies cannot be disabled as they are necessary for the website to function.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 6: Mobile App Cookies */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">6. Mobile App & Similar Technologies</h2>
              </div>
              
              <p className="text-gray-600 mb-4 font-light">
                If you use our mobile app or other digital services, we may use similar technologies to cookies, 
                including:
              </p>
              
              <ul className="space-y-3">
                {[
                  "Local storage and session storage",
                  "Mobile device identifiers and advertising IDs",
                  "Push notification tokens",
                  "App usage analytics and crash reporting"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 shrink-0" />
                    <span className="text-gray-600 font-light">{item}</span>
                  </li>
                ))}
              </ul>
              
              <p className="text-gray-600 mt-4 font-light">
                You can manage these through your device settings and app-specific privacy controls.
              </p>
            </div>

            {/* Section 7: Updates to This Policy */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-primary">7. Updates to This Policy</h2>
              </div>
              
              <p className="text-gray-600 font-light">
                We may update this Cookies Policy from time to time to reflect changes in our practices, 
                technology, or legal requirements. We will notify you of any significant changes by updating 
                the &quot;Last Updated&quot; date at the top of this policy and, where required, by other means such 
                as email notification or website banners.
              </p>
            </div>

            {/* Section 8: Contact Us */}
            <div className="p-8">
              <h2 className="text-2xl font-medium text-primary mb-6">8. Contact Us</h2>
              <p className="text-gray-600 mb-6 font-light">
                If you have questions about our use of cookies or this policy, please contact us:
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
