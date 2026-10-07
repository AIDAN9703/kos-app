import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { Toaster } from "@/shared/components/ui/toaster";
import { Montserrat } from "next/font/google";
import GoogleMapsScript from "@/shared/lib/providers/GoogleMapsScript";
import { ImageKitProvider } from "@imagekit/next";
import CookiesConsent from "@/shared/components/CookiesConsent";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Script from "next/script";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kings Of The Sea Yachts | Luxury Yacht Charters",
    template: "%s | KOS Yachts",
  },
  description:
    "Set sail with Kings of the Sea Yachts' international fleet. From Miami luxury charters to worldwide parties & events, book unforgettable adventures.",
  // metadataBase is required for relative URLs in metadata fields (like openGraph images)
  metadataBase: new URL("https://www.kosyachts.com"),
  // OpenGraph metadata for social media sharing (Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Kings Of The Sea Yachts",
    // Title and description inherit from root metadata if not specified
    images: [
      {
        url: "/images/herooption22.jpg", // Relative URL - uses metadataBase
        width: 1200,
        height: 630,
        alt: "Luxury yachts in Miami waters - Kings Of The Sea Yachts",
      },
    ],
  },
  // Twitter/X card metadata
  twitter: {
    card: "summary_large_image",
    // Title and description inherit from openGraph if not specified
    images: ["/images/herooption22.jpg"], // Relative URL - uses metadataBase
  },
  // Structured data (JSON-LD) for rich search results and SEO
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Kings Of The Sea Yachts",
      alternateName: "KOS Yachts",
      description:
        "Luxury yacht charters in Miami with premium boat rentals and private yacht experiences",
      url: "https://www.kosyachts.com",
      logo: "https://www.kosyachts.com/icons/logo.png",
      image: [
        "https://www.kosyachts.com/images/herooption22.jpg",
        "https://www.kosyachts.com/clients/koshat.jpeg",
        "https://www.kosyachts.com/clients/niceyacht.jpg",
      ],
      category: "Yacht Charter",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Miami",
        addressRegion: "FL",
        addressCountry: "US",
      },
      telephone: "+1-305-521-8877",
      priceRange: "$$$",
      serviceArea: {
        "@type": "GeoCircle",
        geoMidpoint: {
          "@type": "GeoCoordinates",
          latitude: 25.7617,
          longitude: -80.1918,
        },
        geoRadius: "50000",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Yacht Charter Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Luxury Yacht Charters",
              description: "Premium yacht charters in Miami",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Fishing Charters",
              description: "Professional fishing charters in Miami waters",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Private Yacht Experiences",
              description: "Exclusive private yacht charters",
            },
          },
        ],
      },
    }),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const RootLayout = async ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
      </head>
      <body className={`${montserrat.className} ${montserrat.variable} antialiased`}>
        <GoogleMapsScript />
        <ImageKitProvider
          urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ""}
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
          <CookiesConsent />
        </ImageKitProvider>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PQTQNKBB');`,
          }}
        />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NQ8VSCWB85"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-NQ8VSCWB85');`,
          }}
        />
      </body>
    </html>
  );
};

export default RootLayout;
