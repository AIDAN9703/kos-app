import { listBoats } from "@/features/boats/boat.data";
import { countListingsAwaitingReview } from "@/features/owner-listing/listing.data";
import { boatSearchParamsCache } from "@/features/boats/searchParams";
import { AdminBoatFilter } from "@/features/boats/components/AdminBoatFilter";
import { AdminBoatTablePagination } from "@/features/boats/components/AdminBoatTablePagination";
import { AdminBoatsTable } from "@/features/boats/components/AdminBoatsTable";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";

export default async function BoatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await boatSearchParamsCache.parse(searchParams);

  const [result, awaitingReview] = await Promise.all([
    listBoats({
      search: params.search || undefined,
      category: params.category ?? undefined,
      featured: params.featured ?? undefined,
      active: params.active ?? undefined,
      minPrice: params.minPrice ?? undefined,
      maxPrice: params.maxPrice ?? undefined,
      minLength: params.minLength ?? undefined,
      maxLength: params.maxLength ?? undefined,
      minCapacity: params.minCapacity ?? undefined,
      maxCapacity: params.maxCapacity ?? undefined,
      minYear: params.minYear ?? undefined,
      maxYear: params.maxYear ?? undefined,
      minSleeps: params.minSleeps ?? undefined,
      minBathrooms: params.minBathrooms ?? undefined,
      locationLabel: params.locationLabel ?? undefined,
      crewRequired: params.crewRequired ?? undefined,
      instantBook: params.instantBook ?? undefined,
      dayCharter: params.dayCharter ?? undefined,
      termCharter: params.termCharter ?? undefined,
      page: params.page,
      limit: params.limit,
    }),
    countListingsAwaitingReview(),
  ]);

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader
              title="Boats"
              actions={
                <>
                  <Button
                    asChild
                    variant="glass"
                    className="h-9 gap-2 rounded-full border-0 px-4 font-semibold"
                  >
                    <Link href="/admin/owners">Owners</Link>
                  </Button>
                  <Button
                    asChild
                    variant="glass"
                    className="h-9 gap-2 rounded-full border-0 px-4 font-semibold"
                  >
                    <Link href="/admin/boats/review">
                      Owner listings
                      {awaitingReview > 0 ? (
                        <span className="min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] leading-5 font-bold text-white tabular-nums">
                          {awaitingReview}
                        </span>
                      ) : null}
                    </Link>
                  </Button>
                  <Button asChild className="h-9 gap-1.5 rounded-full px-4 font-semibold">
                    <Link href="/admin/boats/create">
                      <Plus className="size-3.5" />
                      New boat
                    </Link>
                  </Button>
                </>
              }
            />
            <AdminBoatFilter />
          </>
        }
        pagination={
          <AdminBoatTablePagination
            totalCount={result.totalCount}
            totalPages={result.totalPages}
            page={result.page}
            limit={result.limit}
          />
        }
      >
        <AdminBoatsTable boats={result.boats} />
      </AdminListShell>
    </GlassPage>
  );
}
