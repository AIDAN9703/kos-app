import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/general-utils";
import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { ArrowLink } from "@/features/profile/components/ArrowLink";
import { Section } from "@/features/profile/components/Section";
import { surface } from "@/features/profile/components/surface";
import { TRIP_FALLBACK_IMAGE } from "@/features/profile/trip-presentation";
import { BookedCalendar } from "@/features/owner-dashboard/components/BookedCalendar";
import { CharterList } from "@/features/owner-dashboard/components/CharterList";
import { PricingTiersTable } from "@/features/owner-dashboard/components/PricingTiersTable";
import { buildOwnerAnalytics, splitCharters } from "@/features/owner-dashboard/owner-analytics";
import { categoryLabel } from "@/features/owner-dashboard/owner-presentation";
import { getMyBoat, getMyCharters } from "@/features/owner-dashboard/owner.data";

export default async function OwnerBoatPage({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireOwner(), params]);
  // Both reads are scoped to the signed-in owner: another owner's boat id is a 404.
  const [boat, charters] = await Promise.all([getMyBoat(id), getMyCharters(id)]);
  if (!boat) notFound();

  const now = new Date();
  const [performance] = buildOwnerAnalytics(charters, [boat], now).byBoat;
  const { upcoming, past } = splitCharters(charters, now);
  const specs = [
    { label: "Type", value: categoryLabel(boat.category) },
    { label: "Length", value: `${boat.lengthFt} ft` },
    { label: "Guests", value: `Up to ${boat.capacity}` },
    {
      label: "Built",
      value: [boat.yearBuilt, boat.make, boat.model].filter(Boolean).join(" ") || null,
    },
    { label: "Location", value: boat.locationLabel },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));
  const stats = [
    { label: `Charters in ${now.getFullYear()}`, value: String(performance.charters) },
    { label: "Hours chartered", value: String(performance.hours) },
    {
      label: "Your payout",
      value:
        performance.earningsCents > 0 ? formatCentsAsWholeDollars(performance.earningsCents) : "—",
    },
  ];

  return (
    <div className="space-y-10">
      <ArrowLink href="/owner/boats" direction="back">
        My boats
      </ArrowLink>

      <article className={`overflow-hidden md:grid md:grid-cols-2 ${surface}`}>
        <div className="relative aspect-[16/10] bg-slate-100 md:aspect-auto md:min-h-[300px]">
          <Image
            src={boat.mainImage || TRIP_FALLBACK_IMAGE}
            alt={boat.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 560px"
          />
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <span
            className={cn(
              "self-start rounded-full px-2.5 py-0.5 text-xs font-semibold",
              boat.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {boat.active ? "Live on kosyachts.com" : "Not listed"}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {boat.name}
          </h1>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {specs.map((spec) => (
              <div key={spec.label}>
                <dt className="text-slate-500">{spec.label}</dt>
                <dd className="font-medium text-slate-800">{spec.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            {boat.active ? (
              <Button asChild className="rounded-full px-5">
                <Link href={`/boats/${boat.id}`}>View public listing</Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="rounded-full border-0 bg-slate-100 px-5 text-primary hover:bg-slate-200 hover:text-primary"
            >
              <Link href="/contact">Request a change</Link>
            </Button>
          </div>
        </div>
      </article>

      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`p-5 ${surface}`}>
            <dt className="text-sm font-medium text-slate-500">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-primary tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <Section
        id="calendar"
        title="Calendar"
        description="Booked days for this boat. To block dates, contact the team."
      >
        <div className={`p-5 sm:p-6 ${surface}`}>
          <BookedCalendar charters={charters} timezone={boat.timezone} />
        </div>
      </Section>

      <Section id="rates" title="Rates">
        <div className={`px-5 py-1 sm:px-6 ${surface}`}>
          <PricingTiersTable tiers={boat.tiers} />
        </div>
      </Section>

      <Section id="boat-upcoming" title="Upcoming charters">
        <CharterList charters={upcoming} hideBoat empty="Nothing booked on this boat right now." />
      </Section>

      {past.length > 0 ? (
        <Section id="boat-past" title="Past charters">
          <CharterList charters={past.slice(0, 10)} hideBoat empty="" />
        </Section>
      ) : null}
    </div>
  );
}
