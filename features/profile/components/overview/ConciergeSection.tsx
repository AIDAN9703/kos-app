import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Section } from "../Section";

const CHANNELS = [
  { Icon: Phone, label: "Call or text", value: "(305) 521-8877", href: "tel:+13055218877" },
  {
    Icon: Mail,
    label: "Email",
    value: "contact@kosyachts.com",
    href: "mailto:contact@kosyachts.com",
  },
  { Icon: MessageCircle, label: "Message us", value: "Contact form", href: "/contact" },
];

/** Who to call. A concierge business should never make a guest hunt for a phone number. */
export function ConciergeSection() {
  return (
    <Section
      id="concierge"
      title="Your KOS concierge"
      description="Planning something special, changing a trip, or redeeming points? We're a message away."
    >
      <ul className="grid gap-3 sm:grid-cols-3">
        {CHANNELS.map(({ Icon, label, value, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-slate-500">{label}</span>
                <span className="block truncate text-sm font-semibold text-primary group-hover:underline">
                  {value}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
