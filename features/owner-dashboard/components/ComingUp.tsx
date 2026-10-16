import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { guestsLabel, tripTimeRange } from "@/features/profile/trip-presentation";
import { TRIP_FALLBACK_IMAGE } from "@/features/profile/trip-presentation";
import { countdown } from "../owner-insights";
import { payoutSummary } from "../owner-presentation";
import type { OwnerCharter } from "../owner.types";
import { CharterList } from "./CharterList";

function hours(c: OwnerCharter): string | null {
  if (!c.endsAt) return null;
  const h = Math.round((c.endsAt.getTime() - c.startsAt.getTime()) / 36e5);
  return h >= 24 ? `${Math.round(h / 24)} days` : `${h} hours`;
}

/**
 * The next charter as a feature card (photo, countdown, when, where, what it
 * earns), then the few after it as rows.
 */
export function ComingUp({
  charters,
  photos,
  showMoney,
  className,
}: {
  charters: OwnerCharter[];
  /** Boat id → cover photo. */
  photos: Map<string, string | null>;
  /** Managers don't see what a charter earns. */
  showMoney: boolean;
  className?: string;
}) {
  const [next, ...rest] = charters;
  return (
    <GlassPanel
      title="Coming up"
      className={className}
      aside={
        charters.length > 0 ? (
          <Link
            href="/owner/charters"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            All charters →
          </Link>
        ) : null
      }
    >
      {next ? (
        <>
          <article className="grid grid-cols-1 overflow-hidden rounded-2xl bg-glass-inset ring-1 ring-glass-border ring-inset sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="relative aspect-[16/9] sm:aspect-auto">
              <Image
                src={photos.get(next.boatId) || TRIP_FALLBACK_IMAGE}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
              />
              <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-[0_6px_18px_-6px_var(--primary)]">
                {countdown(next.startsAt)}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div>
                <p className="text-xs text-muted-foreground">{next.boatName}</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
                  {formatBoatLocal(next.startsAt, next.timezone, "EEEE, MMMM d")}
                </p>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Clock aria-hidden className="size-4 shrink-0" />
                  {[tripTimeRange(next), hours(next)].filter(Boolean).join(" · ")}
                </li>
                {next.pickupLocation ? (
                  <li className="flex items-center gap-2">
                    <MapPin aria-hidden className="size-4 shrink-0" />
                    <span className="truncate">{next.pickupLocation}</span>
                  </li>
                ) : null}
                <li className="flex items-center gap-2">
                  <Users aria-hidden className="size-4 shrink-0" />
                  {guestsLabel(next.guests)}
                </li>
              </ul>
              {showMoney ? (
                <div className="mt-auto flex items-end justify-between border-t border-glass-border pt-3">
                  <span className="text-xs text-muted-foreground">Your earnings</span>
                  <span className="text-lg font-semibold text-foreground tabular-nums">
                    {payoutSummary(next).amount ?? "Pending"}
                  </span>
                </div>
              ) : null}
            </div>
          </article>
          {rest.length > 0 ? (
            <div className="-mx-5 -mb-5 mt-1 border-t border-glass-border">
              <CharterList charters={rest.slice(0, 3)} empty="" showMoney={showMoney} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing booked yet. New charters show up here the moment they&apos;re confirmed.
        </p>
      )}
    </GlassPanel>
  );
}
