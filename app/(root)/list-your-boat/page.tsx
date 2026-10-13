import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, ClipboardList, Globe } from "lucide-react";
import { ListingHero, goldButton } from "@/features/owner-listing/components/landing/ListingHero";
import {
  CharterPreview,
  DotField,
  EarningsPreview,
  PricingPreview,
  ReviewPreview,
} from "@/features/owner-listing/components/landing/ProductPreviews";
import { getComparableBoats } from "@/features/owner-listing/estimate.data";
import { getBoatCatalog } from "@/features/boat-catalog/boat-catalog.data";
import { MIN_PHOTOS } from "@/features/owner-listing/listing.constants";

// DRAFT (2026-10-08): owner economics are TBD, so copy here avoids promising
// fees, payout timing or insurance. Product cards use illustrative numbers.

export const metadata: Metadata = {
  title: "List your boat",
  description:
    "List your boat with KOS Yachts. See what boats like yours earn, set your prices, and get booked by guests chartering in Miami.",
};

// Prices for the estimate change slowly; refresh hourly.
export const revalidate = 3600;

const STEPS = [
  {
    icon: ClipboardList,
    title: "List",
    body: "Details, photos and your price for each trip. About 15 minutes.",
  },
  {
    icon: BadgeCheck,
    title: "Review",
    body: "The KOS team checks every listing before it goes live.",
  },
  {
    icon: Globe,
    title: "Go live",
    body: "Your boat joins the fleet guests already book every week.",
  },
  {
    icon: CalendarCheck,
    title: "Get booked",
    body: "Charters come in through KOS. Follow each one in your portal.",
  },
];

const FAQ = [
  {
    q: "What does it cost to list?",
    a: "Nothing up front. KOS keeps a share of each booking; the team walks you through the numbers before your boat goes live.",
  },
  {
    q: "What do I need to get started?",
    a: `The boat's make, model, year and length, at least ${MIN_PHOTOS} good photos, and its HIN, registration and insurance details.`,
  },
  {
    q: "Who sets the price?",
    a: "You set a price for each trip length you offer. We show you what similar boats on KOS book for, so you can start in the right range.",
  },
  {
    q: "Do I need a captain?",
    a: "Every KOS charter is crewed. Captain it yourself with a USCG license, use your own captain, or have us provide one.",
  },
  {
    q: "Can I take my boat off the site?",
    a: "Yes. Once it's approved you can hide or show the listing from your owner portal at any time.",
  },
];

/** One photo row with a piece of the product floating over the photo. */
function FeatureRow({
  title,
  body,
  image,
  alt,
  flip,
  children,
}: {
  title: string;
  body: string;
  image: string;
  alt: string;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className={flip ? "lg:order-2" : undefined}>
        <h3 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">{title}</h3>
        <p className="mt-4 max-w-md text-[17px] leading-8 text-slate-600">{body}</p>
      </div>
      <div className={`relative pb-16 sm:pb-10 ${flip ? "lg:order-1" : ""}`}>
        <DotField className={flip ? "-top-6 -left-6 h-40 w-40" : "-right-6 -bottom-2 h-40 w-48"} />
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-200 shadow-[0_30px_60px_-30px_rgba(15,30,45,0.5)]">
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover"
          />
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function ListYourBoatPage() {
  const [comparables, catalog] = await Promise.all([getComparableBoats(), getBoatCatalog()]);

  return (
    <div className="bg-white">
      <ListingHero boats={comparables} catalog={catalog} />

      {/* How it works: a navy block with the steps card riding over it. */}
      <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <div className="relative">
            <div className="rounded-3xl bg-primary px-6 pt-10 pb-32 sm:px-10 lg:w-[42%] lg:pb-40">
              <p className="text-[11px] font-semibold tracking-[0.24em] text-gold-glow uppercase">
                How it works
              </p>
              <h2 className="mt-4 max-w-[16rem] text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl lg:max-w-[15rem]">
                Four steps from the dock to booked.
              </h2>
            </div>
            <ol className="relative -mt-24 grid gap-8 rounded-3xl bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,30,45,0.45)] ring-1 ring-black/5 sm:grid-cols-2 sm:p-10 lg:absolute lg:top-16 lg:right-0 lg:mt-0 lg:w-[66%] lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7f4ee] text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-primary">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* The walk-through: photos with the real screens floating on them. */}
      <section className="overflow-hidden bg-[#f7f4ee] py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] space-y-20 px-4 sm:px-8 sm:space-y-28">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight text-primary sm:text-5xl">
            Everything an owner needs, nothing they don&apos;t.
          </h2>

          <FeatureRow
            title="Price it your way"
            body="Pick the trip lengths you offer and set a price for each. You see what boats like yours book for on KOS, and what you take home, before you save."
            image="/clients/niceyacht.jpg"
            alt="A yacht's main salon looking out over Biscayne Bay"
          >
            <PricingPreview className="absolute -bottom-2 left-4 sm:-left-8" />
          </FeatureRow>

          <FeatureRow
            flip
            title="A real team reviews it"
            body="Every listing gets a once-over from the KOS team: photos, prices, documents. If something needs another look we tell you exactly what, and you fix it in minutes."
            image="/images/services/dock-management.jpg"
            alt="Yachts tied up along a marina dock, seen from above"
          >
            <ReviewPreview className="absolute right-4 -bottom-2 sm:-right-8" />
          </FeatureRow>

          <FeatureRow
            title="Follow every charter"
            body="Your owner portal shows upcoming trips, what each one earns and how your year is going. Hide the listing whenever you want the boat to yourself."
            image="/images/services/yacht-management.jpg"
            alt="A motor yacht cruising over turquoise water"
          >
            <CharterPreview className="absolute -bottom-4 left-4 sm:-left-8" />
            <EarningsPreview className="absolute -top-6 right-4 hidden sm:-right-6 sm:block" />
          </FeatureRow>
        </div>
      </section>

      {/* Captain banner: photo + navy panel. */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <div className="grid overflow-hidden rounded-3xl bg-primary lg:grid-cols-5">
            <div className="relative aspect-[16/10] lg:col-span-3 lg:aspect-auto lg:min-h-[380px]">
              <Image
                src="/images/experiences/sunset.jpg"
                alt="Guests on the bow at sunset"
                fill
                sizes="(max-width: 1024px) 100vw, 720px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-2">
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Need a captain?
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-white/80">
                Every KOS charter is crewed. Captain it yourself with a USCG license, bring your
                own, or let us crew it from our captain network.
              </p>
              <Link
                href="/list-your-boat/start"
                className="mt-8 inline-flex items-center gap-2 self-start text-[15px] font-bold text-gold-glow underline-offset-4 hover:underline"
              >
                Start your listing →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Questions owners ask first. */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 sm:px-8 lg:grid-cols-12">
          <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl lg:col-span-4">
            Owner questions
          </h2>
          <div className="divide-y divide-border border-y border-border lg:col-span-8">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-primary">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-xl leading-none text-slate-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing band over the skyline. */}
      <section id="list-cta-end" className="relative isolate overflow-hidden bg-primary">
        <Image
          src="/images/herooption22.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover object-[50%_35%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-primary/70" />
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-4 py-20 sm:px-8 sm:py-28 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl text-white">
            <h2 className="text-4xl leading-[1.05] font-black tracking-tight sm:text-6xl">
              Ready when you are.
            </h2>
            <p className="mt-4 text-lg text-white/85">
              Start with the basics. Your listing saves as you go, so you can finish it later.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link href="/list-your-boat/start" className={goldButton}>
              Start your listing
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Talk to our team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
