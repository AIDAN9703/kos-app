import Image from "next/image";
import Link from "next/link";
import { GlassHeader, GlassPage, GlassPanel } from "@/shared/admin/components/glass";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { categoryLabel } from "@/features/owner-dashboard/owner-presentation";
import { getReviewQueue } from "@/features/owner-listing/listing.data";
import { LISTING_STATUS_LABELS } from "@/features/owner-listing/listing.constants";

/** Boats owners listed themselves, waiting for KOS (or sent back to them). */
export default async function ListingReviewPage() {
  const queue = await getReviewQueue();
  const waiting = queue.filter((l) => l.status === "IN_REVIEW").length;

  return (
    <GlassPage>
      <GlassHeader
        back="/admin/boats"
        eyebrow="Boats"
        title="Owner listings"
        meta={
          <span>
            {waiting === 0 ? "Nothing waiting for review" : `${waiting} waiting for review`}
          </span>
        }
      />
      {queue.length === 0 ? (
        <GlassPanel>
          <p className="text-sm text-muted-foreground">
            When an owner submits a boat from List your boat, it shows up here to approve or send
            back.
          </p>
        </GlassPanel>
      ) : (
        <GlassPanel className="p-0">
          <ul className="divide-y divide-border">
            {queue.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/admin/boats/review/${listing.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted"
                >
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {listing.images[0] ? (
                      <Image
                        src={listing.images[0]}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {listing.displayTitle || listing.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        categoryLabel(listing.category),
                        `${listing.lengthFt} ft`,
                        listing.locationLabel,
                        listing.owner.name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {listing.submittedAt ? `Submitted ${formatDate(listing.submittedAt)}` : ""}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {LISTING_STATUS_LABELS[listing.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </GlassPage>
  );
}
