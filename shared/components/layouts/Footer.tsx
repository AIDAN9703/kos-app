import Link from "next/link";
import Image from "next/image";
import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import { FaYoutube, FaTiktok } from "react-icons/fa";
import { navigationData } from "@/shared/lib/constants/navigation-data";

/* "Top locations" is derived from the same navigationData the header uses,
   so a new destination added there shows up in the footer for free. */
const topLocations =
  navigationData.main
    .find((i) => i.label === "Explore")
    ?.sections?.find((s) => s.title === "Locations")?.items ?? [];

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about-us" },
      { label: "KOS Yacht Club", href: "/kos-yacht-club" },
      { label: "Careers", href: "/careers" },
      { label: "News & blog", href: "/news" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Search boats", href: "/boats/search" },
      { label: "All experiences", href: "/experiences" },
      { label: "Term charters", href: "/experiences/term-charters" },
      { label: "Special events", href: "/experiences/special-events" },
      { label: "Store", href: "https://kosyachts.myshopify.com/" },
    ],
  },
  {
    title: "Owners",
    links: [
      { label: "List your boat", href: "/services/charter-management" },
      { label: "Charter management", href: "/services/charter-management" },
      { label: "Yacht management", href: "/services/yacht-management" },
      { label: "Dock management", href: "/services/dock-management" },
      { label: "Sales & purchase", href: "/services/sales" },
    ],
  },
  {
    title: "Top locations",
    links: topLocations.slice(0, 6).map((l) => ({ label: l.label, href: l.href })),
  },
];

const LEGAL_LINKS = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms-of-service" },
  { label: "Cancellation policy", href: "/cancellation-policy" },
  { label: "Cookies", href: "/cookies" },
];

const SOCIALS = [
  { href: "https://instagram.com/kosyachts", label: "Instagram", icon: Instagram },
  { href: "https://www.tiktok.com/@kosyachts", label: "TikTok", icon: FaTiktok },
  { href: "https://www.youtube.com/@Kosyachts", label: "YouTube", icon: FaYoutube },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr] lg:gap-14">
          {/* Brand + contact */}
          <div>
            <Link href="/" className="inline-block rounded-full transition-transform hover:scale-105">
              <Image
                src="/icons/transparent-logo.png"
                alt="KOS Yachts"
                width={48}
                height={48}
                className="rounded-full"
              />
            </Link>
            <div className="mt-5 space-y-2.5">
              <a
                href="tel:+13055218877"
                className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-primary"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                (305) 521-8877
              </a>
              <a
                href="mailto:contact@kosyachts.com"
                className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-primary"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                contact@kosyachts.com
              </a>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                Miami, FL
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-6">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-primary">{col.title}</h3>
                <div className="space-y-2.5">
                  {col.links.map((link) => (
                    <Link
                      key={`${link.label}-${link.href}`}
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="block text-sm text-gray-600 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom rail: © + legal on the left, socials on the right. */}
        <div className="mt-12 border-t border-gray-200 pt-6">
          <div className="flex flex-col-reverse items-center gap-5 md:flex-row md:justify-between">
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-6">
              <p className="text-sm text-gray-600">
                &copy; {new Date().getFullYear()} Kings of the Sea Yachts. All rights reserved.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {LEGAL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
