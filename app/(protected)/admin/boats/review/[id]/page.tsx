import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GlassHeader, GlassPage, GlassPanel } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { categoryLabel } from "@/features/owner-dashboard/owner-presentation";
import { ReviewActions } from "@/features/owner-listing/components/admin/ReviewActions";
import { missingForReview } from "@/features/owner-listing/listing-progress";
import {
  CAPTAIN_ARRANGEMENTS,
  LISTING_STATUS_LABELS,
  PLACEHOLDER_KOS_FEE_PERCENT,
  takeHome,
} from "@/features/owner-listing/listing.constants";
import { getListingForReview } from "@/features/owner-listing/listing.data";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-foreground">
            {value || <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ListingReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListingForReview(id);
  if (!listing) notFound();
  const missing = missingForReview(listing);
  const captain = CAPTAIN_ARRANGEMENTS.find((c) => c.value === listing.captainArrangement)?.label;

  return (
    <GlassPage>
      <GlassHeader
        back="/admin/boats/review"
        eyebrow="Owner listing"
        title={listing.displayTitle || listing.name}
        meta={
          <>
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">
              {LISTING_STATUS_LABELS[listing.status]}
            </span>
            {listing.submittedAt ? <span>Submitted {formatDate(listing.submittedAt)}</span> : null}
          </>
        }
        actions={
          <Button asChild variant="glass" className="h-9 rounded-full border-0 px-4 font-semibold">
            <Link href={`/admin/boats/${listing.id}/edit`}>Open in boat editor</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <GlassPanel title={`Photos (${listing.images.length})`}>
            {listing.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {listing.images.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={i === 0 ? "col-span-2 row-span-2" : ""}
                  >
                    <div
                      className={`relative overflow-hidden rounded-md bg-muted ${i === 0 ? "aspect-[4/3] h-full" : "aspect-[4/3]"}`}
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 240px"
                      />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No photos.</p>
            )}
          </GlassPanel>

          <GlassPanel title="Description">
            <p className="whitespace-pre-line text-sm leading-6 text-foreground">
              {listing.description || <span className="text-muted-foreground">Not written.</span>}
            </p>
            {listing.features.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {listing.features.map((f) => (
                  <li
                    key={f}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </GlassPanel>

          <GlassPanel title="Boat">
            <Facts
              rows={[
                ["Type", categoryLabel(listing.category)],
                [
                  "Make & model",
                  listing.make
                    ? [listing.make, listing.model ?? "Other"].join(" · ")
                    : "Other: set it in the boat editor",
                ],
                ["Built", listing.yearBuilt ? String(listing.yearBuilt) : null],
                ["Name", listing.name],
                ["Length", `${listing.lengthFt} ft`],
                ["Guests", String(listing.capacity)],
                [
                  "Sleeps / baths",
                  [listing.sleeps, listing.bathrooms].map((n) => n ?? "—").join(" / "),
                ],
                ["Location", listing.locationLabel],
                ["Boarding", listing.dockInfo],
                ["Parking", listing.parkingInfo],
                ["Time zone", listing.timezone],
              ]}
            />
          </GlassPanel>
        </div>

        <div className="space-y-4">
          <GlassPanel title="Decision">
            {listing.status === "IN_REVIEW" ? (
              <>
                {missing.length > 0 ? (
                  <p className="text-sm text-destructive">
                    Incomplete: {missing.map((m) => m.message).join("; ")}.
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Approving publishes the boat. Check the location pin, turnaround and anything else
                  in the boat editor first if needed.
                </p>
                <ReviewActions boatId={listing.id} />
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Sent back to the owner. They see this note:</p>
                <p className="whitespace-pre-line text-foreground">{listing.reviewNote}</p>
              </div>
            )}
          </GlassPanel>

          <GlassPanel title="Owner">
            <Facts
              rows={[
                [
                  "Name",
                  <Link
                    key="n"
                    href={`/admin/users/${listing.owner.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {listing.owner.name}
                  </Link>,
                ],
                ["Email", listing.owner.email],
                ["Phone", listing.owner.phone],
              ]}
            />
          </GlassPanel>

          <GlassPanel title="Trips and prices">
            {listing.trips.length > 0 ? (
              <Facts
                rows={listing.trips.map((t) => [
                  `${t.hours} hours`,
                  `${usd(t.price)} · owner ~${usd(takeHome(t.price))}`,
                ])}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No trips priced.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Owner share at a placeholder {PLACEHOLDER_KOS_FEE_PERCENT}% fee (TBD).
            </p>
            <Facts
              rows={[
                ["Captain", captain],
                ["Fuel", listing.fuelIncluded ? "Included" : "Guest pays"],
              ]}
            />
          </GlassPanel>

          <GlassPanel title="Rules and documents">
            <Facts
              rows={[
                ["Cancellation", listing.cancellationPolicy],
                [
                  "House rules",
                  listing.rules ? (
                    <span className="whitespace-pre-line">{listing.rules}</span>
                  ) : null,
                ],
                ["HIN", listing.hullId],
                ["Registration", listing.registrationNumber],
                ["Insurance", listing.insuranceInfo],
                [
                  "Insurance expires",
                  listing.insuranceExpiry ? formatDate(listing.insuranceExpiry) : null,
                ],
              ]}
            />
          </GlassPanel>
        </div>
      </div>
    </GlassPage>
  );
}
