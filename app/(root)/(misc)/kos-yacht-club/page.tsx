import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

// Force static generation - this coming soon page has no dynamic content
export const dynamic = "force-static";

/* Members-club teaser as a full-screen COVER: the fleet photo under a deep
   navy wash, the hero's hairline-caps-hairline eyebrow, one statement, one
   gold CTA. A different skeleton from careers (photo hero + sections) and
   the about page (light editorial) — same brand voice. */
export default function KOSYachtClubPage() {
  return (
    <section className="relative flex min-h-[calc(100svh-var(--header-h))] w-full items-center overflow-hidden">
      <Image
        src="/images/koshero.jpg"
        alt="The KOS fleet"
        fill
        priority
        quality={90}
        sizes="100vw"
        className="object-cover"
      />
      {/* Navy wash — keeps the photo present but the page unmistakably dark */}
      <div aria-hidden className="absolute inset-0 bg-dark-bg/60" />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-dark-bg/90 via-dark-bg/30 to-dark-bg/40"
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {/* The hero's signature eyebrow — hairline · caps · hairline */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <span aria-hidden className="h-px w-8 bg-linear-to-r from-transparent to-gold sm:w-12" />
            <p className="whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold-glow sm:text-xs">
              Members only · Coming soon
            </p>
            <span aria-hidden className="h-px w-8 bg-linear-to-l from-transparent to-gold sm:w-12" />
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] sm:text-6xl">
            The KOS Yacht Club.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-[15px] font-light leading-relaxed text-white/80 sm:text-lg">
            An exclusive members-only experience featuring the finest luxury yacht charters,
            premium amenities, and unparalleled service.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-gold px-7 text-[15px] font-semibold text-dark-bg hover:bg-gold-glow"
            >
              <Link href="/contact">Get notified</Link>
            </Button>
            {/* Borderless pill — the site's quiet-button style, dark-surface flavor. */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 rounded-full border-0 bg-white/10 px-7 text-[15px] font-medium text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
            >
              <a href="mailto:contact@kosyachts.com">Contact us</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Cover-page footer line */}
      <p className="absolute inset-x-0 bottom-6 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
        Kings of the Sea · Miami, Florida
      </p>
    </section>
  );
}
