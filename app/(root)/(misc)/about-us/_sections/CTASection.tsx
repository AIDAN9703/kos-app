import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function CTASection() {
  return (
    /* Horizontal closing bar — statement left, actions right, one hairline. */
    <section className="py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
        <div className="flex flex-col gap-8 border-t border-border pt-10 md:flex-row md:items-center md:justify-between md:gap-12 sm:pt-14">
          <div className="max-w-xl">
            {/* Same statement style as the page's opening headline. */}
            <h2 className="text-4xl font-black leading-[1.08] tracking-tight text-primary sm:text-5xl">
              Ready to write your story?
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
              Our team turns the day you&apos;re imagining into a charter on the calendar.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500">
              <a
                href="mailto:contact@kosyachts.com"
                className="transition-colors hover:text-primary"
              >
                contact@kosyachts.com
              </a>
              <a href="tel:+13055218877" className="transition-colors hover:text-primary">
                (305) 521-8877
              </a>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 rounded-full px-7">
              <Link href="/boats/search">Explore the fleet</Link>
            </Button>
            {/* Borderless pill — soft grey fill, the site's quiet-button style. */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 rounded-full border-0 bg-foreground/10 px-7 text-primary hover:bg-foreground/15 hover:text-primary"
            >
              <Link href="/contact">Contact our team</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
