import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { GlassHeader, GlassPage, GlassPanel, GlassStat } from "@/shared/admin/components/glass";
import { TRIP_FALLBACK_IMAGE } from "@/features/profile/trip-presentation";
import { BookedCalendar } from "@/features/owner-dashboard/components/BookedCalendar";
import { CharterList } from "@/features/owner-dashboard/components/CharterList";
import { StatusChip } from "@/features/owner-dashboard/components/FleetGrid";
import { NeedsAttention } from "@/features/owner-dashboard/components/NeedsAttention";
import { PricingTiersTable } from "@/features/owner-dashboard/components/PricingTiersTable";
import { buildOwnerAnalytics, splitCharters } from "@/features/owner-dashboard/owner-analytics";
import { attentionItems } from "@/features/owner-dashboard/owner-insights";
import { categoryLabel, isListingInProgress } from "@/features/owner-dashboard/owner-presentation";
import { getMyBoat, getMyCharters, getMyOwnerView } from "@/features/owner-dashboard/owner.data";
import { ListingVisibilityButton } from "@/features/owner-listing/components/ListingVisibilityButton";

const pill =
  "flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-[filter] hover:brightness-110";

export default async function OwnerBoatPage({ params }: { params: Promise<{ id: string }> }) {
  const [, { id }] = await Promise.all([requireOwner(), params]);
  // Both reads are scoped to the signed-in owner: another owner's boat id is a 404.
  const [view, boat, charters] = await Promise.all([
    getMyOwnerView(),
    getMyBoat(id),
    getMyCharters(id),
  ]);
  const showMoney = view.canSeeMoney;
  if (!boat) notFound();

  const now = new Date();
  const [performance] = buildOwnerAnalytics(charters, [boat], now).byBoat;
  const { upcoming, past } = splitCharters(charters, now);
  const selfListed = boat.managedBy === "OWNER";
  const flags = attentionItems([boat], now);
  const specs = [
    categoryLabel(boat.category),
    `${boat.lengthFt} ft`,
    `Up to ${boat.capacity} guests`,
    [boat.yearBuilt, boat.make, boat.model].filter(Boolean).join(" ") || null,
  ].filter(Boolean);

  return (
    <GlassPage backdrop={boat.mainImage}>
      <GlassHeader
        back="/owner/boats"
        leading={
          <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-glass-border">
            <Image
              src={boat.mainImage || TRIP_FALLBACK_IMAGE}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </span>
        }
        title={boat.name}
        meta={
          <>
            <StatusChip boat={boat} />
            <span>{specs.join(" · ")}</span>
            {boat.locationLabel ? <span>· {boat.locationLabel}</span> : null}
          </>
        }
        actions={
          <>
            {boat.active ? (
              <Link
                href={`/boats/${boat.id}`}
                className={`${pill} border border-glass-border bg-glass-strong text-foreground`}
              >
                <ExternalLink aria-hidden className="size-4" /> Public listing
              </Link>
            ) : null}
            {selfListed ? (
              <>
                <Link
                  href={
                    isListingInProgress(boat)
                      ? `/list-your-boat/${boat.id}`
                      : `/list-your-boat/${boat.id}/details`
                  }
                  className={`${pill} bg-primary text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)]`}
                >
                  <Pencil aria-hidden className="size-4" />
                  {isListingInProgress(boat) ? "Continue listing" : "Edit listing"}
                </Link>
                {boat.listingStatus === "APPROVED" ? (
                  <ListingVisibilityButton boatId={boat.id} live={boat.active} />
                ) : null}
              </>
            ) : (
              <Link
                href="/contact"
                className={`${pill} border border-glass-border bg-glass-strong text-foreground`}
              >
                Request a change
              </Link>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {showMoney ? (
            <GlassStat
              size="lg"
              label={`Earned in ${now.getFullYear()}`}
              value={
                performance.earningsCents > 0
                  ? formatCentsAsWholeDollars(performance.earningsCents)
                  : "—"
              }
            />
          ) : (
            <GlassStat
              size="lg"
              label="Next charter"
              value={
                upcoming[0]
                  ? formatBoatLocal(upcoming[0].startsAt, upcoming[0].timezone, "MMM d")
                  : "None booked"
              }
            />
          )}
          <GlassStat
            size="lg"
            label={`Charters in ${now.getFullYear()}`}
            value={performance.charters}
          />
          <GlassStat size="lg" label="Hours on the water" value={performance.hours} />
          <GlassStat size="lg" label="Upcoming charters" value={upcoming.length} />
        </div>

        {flags.length > 0 ? <NeedsAttention items={flags} /> : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <GlassPanel title="Booked days" className="xl:col-span-7">
            <BookedCalendar charters={charters} timezone={boat.timezone} />
            <p className="text-xs text-muted-foreground">
              To block dates for your own use, contact the team.
            </p>
          </GlassPanel>
          <GlassPanel title="Rates" className="xl:col-span-5">
            <PricingTiersTable tiers={boat.tiers} showMoney={showMoney} />
          </GlassPanel>
        </div>

        <GlassPanel
          title="Upcoming charters"
          className="p-0 [&>div:first-child]:px-5 [&>div:first-child]:pt-5"
        >
          <CharterList
            charters={upcoming}
            hideBoat
            empty="Nothing booked on this boat right now."
            showMoney={showMoney}
          />
        </GlassPanel>

        {past.length > 0 ? (
          <GlassPanel
            title="Past charters"
            className="p-0 [&>div:first-child]:px-5 [&>div:first-child]:pt-5"
          >
            <CharterList charters={past.slice(0, 10)} hideBoat empty="" showMoney={showMoney} />
          </GlassPanel>
        ) : null}
      </div>
    </GlassPage>
  );
}
