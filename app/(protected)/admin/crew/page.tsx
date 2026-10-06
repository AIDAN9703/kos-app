import { Suspense } from "react";
import { captainProfileListSearchParamsCache } from "@/features/profiles/captain-profile.search-params";
import { listCaptains, listCrew } from "@/features/profiles/profiles.data";
import { crewProfileListSearchParamsCache } from "@/features/profiles/crew-profile.search-params";
import { AdminCaptainProfileFilter } from "@/features/profiles/components/AdminCaptainProfileFilter";
import { AdminCaptainProfileCards } from "@/features/profiles/components/AdminCaptainProfileCards";
import { AdminCrewProfileFilter } from "@/features/profiles/components/AdminCrewProfileFilter";
import { AdminCrewProfileCards } from "@/features/profiles/components/AdminCrewProfileCards";
import {
  AdminCrewTabs,
  type CrewPageTab,
} from "@/features/profiles/components/AdminCrewTabs";
import { SearchParams } from "next/dist/server/request/search-params";

function resolveTab(raw: string | string[] | undefined): CrewPageTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "captains" ? "captains" : "crew";
}

export default async function AdminCrewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const tab = resolveTab(resolved.tab);

  if (tab === "captains") {
    await captainProfileListSearchParamsCache.parse(searchParams);
    const params = captainProfileListSearchParamsCache.all();
    const rows = await listCaptains({
      search: params.search || undefined,
      status: params.status ?? undefined,
    });

    return (
      <div className="space-y-6">
        <AdminCrewTabs activeTab="captains" />
        <Suspense fallback={<div className="h-9 max-w-md animate-pulse rounded-md bg-muted" />}>
          <AdminCaptainProfileFilter />
        </Suspense>
        <AdminCaptainProfileCards rows={rows} />
      </div>
    );
  }

  await crewProfileListSearchParamsCache.parse(searchParams);
  const params = crewProfileListSearchParamsCache.all();
  const rows = await listCrew({
    search: params.search || undefined,
    status: params.status ?? undefined,
  });

  return (
    <div className="space-y-6">
      <AdminCrewTabs activeTab="crew" />
      <Suspense fallback={<div className="h-9 max-w-md animate-pulse rounded-md bg-muted" />}>
        <AdminCrewProfileFilter />
      </Suspense>
      <AdminCrewProfileCards rows={rows} />
    </div>
  );
}
