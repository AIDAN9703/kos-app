import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | KOS",
  description:
    "Call, email, or text the Kings of the Sea team — or send a charter inquiry. We reply within 24 hours.",
};

/* Every way to reach us, as hairline columns — values are the links,
   no icon cards. */
const CONTACT_METHODS = [
  {
    label: "Call",
    value: "(305) 521-8877",
    href: "tel:+13055218877",
    note: "Speak with our team directly",
  },
  {
    label: "Email",
    value: "contact@kosyachts.com",
    href: "mailto:contact@kosyachts.com",
    note: "Send us a detailed message",
  },
  {
    label: "Text",
    value: "(305) 521-8877",
    href: "sms:+13055218877",
    note: "Quick questions & updates",
  },
  {
    label: "Schedule",
    value: "Book a meeting",
    href: "https://api.leadconnectorhq.com/widget/bookings/kos-calendars",
    note: "A consultation on your time",
    external: true,
  },
];

const HOURS = [
  { day: "Monday – Friday", time: "9:00 AM – 6:00 PM" },
  { day: "Saturday", time: "10:00 AM – 4:00 PM" },
  { day: "Sunday", time: "By appointment" },
];

export default function ContactPage() {
  return (
    <div className="w-full">
      {/* ── Opener + ways to reach us ── */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-primary sm:text-5xl">
            Contact
          </h1>

          <div className="mt-10 grid grid-cols-1 gap-y-8 sm:mt-12 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4">
            {CONTACT_METHODS.map((method) => (
              <div key={method.label} className="border-l border-border pl-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {method.label}
                </p>
                <a
                  href={method.href}
                  target={method.external ? "_blank" : undefined}
                  rel={method.external ? "noopener noreferrer" : undefined}
                  className="mt-2 block break-words text-base font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                >
                  {method.value}
                </a>
                <p className="mt-1 text-sm leading-6 text-slate-600">{method.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visit us ── */}
      <section className="border-t border-border py-8 sm:py-16">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-black leading-[1.08] tracking-tight text-primary sm:text-4xl">
                Come see us.
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                Stop by the office, or call during business hours.
              </p>
            </div>

            <div className="lg:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Miami office
              </p>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                1234 Biscayne Boulevard
                <br />
                Miami, FL 33132
                <br />
                United States
              </p>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-medium text-primary underline decoration-gold/60 underline-offset-4 transition-colors hover:decoration-gold"
              >
                Get directions
              </a>
            </div>

            <div className="lg:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Hours
              </p>
              <ul className="mt-2 divide-y divide-border/60">
                {HOURS.map((row) => (
                  <li key={row.day} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="text-sm text-slate-600">{row.day}</span>
                    <span className="text-sm font-medium tabular-nums text-primary">
                      {row.time}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-6">
                <span className="font-semibold text-primary">Emergency charters 24/7</span>{" "}
                <span className="text-slate-600">— call anytime for urgent requests.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
