import { Suspense } from "react";
import { Metadata } from "next";

import SearchPageClient from "@/features/search/components/SearchPageClient";
import SearchSkeleton from "@/features/search/components/SearchSkeleton";
import { searchBoats } from "@/features/search/search.data";
import {
  normalizeSearchParams,
  parseNumberParam,
  extractBoundingBox,
} from "@/shared/lib/utils/search-params-utils";

export const metadata: Metadata = {
  title: "Search Boats | KOSyachts",
  description: "Search for luxury yachts and boats available for charter.",
  alternates: {
    canonical: "https://www.kosyachts.com/boats/search",
  },
};

export const revalidate = 1800;

export async function generateStaticParams() {
  return [{}, { category: "yacht" }, { category: "sportfish" }, { category: "sailboat" }];
}

type Props = {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const normalizedParams = normalizeSearchParams(resolvedSearchParams);
  const currentPage = parseNumberParam(normalizedParams.page) || 1;
  const boundingBox = extractBoundingBox(normalizedParams);

  const data = await searchBoats({
    searchParams: normalizedParams,
    limit: 12,
    page: currentPage,
  });

  return (
    <main>
      <Suspense key="boat-search-results" fallback={<SearchSkeleton />}>
        <SearchPageClient
          data={data}
          currentPage={currentPage}
          boundingBox={boundingBox}
        />
      </Suspense>
    </main>
  );
}
