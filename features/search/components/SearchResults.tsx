"use client";

import { useCallback, useMemo } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/shared/components/ui/pagination";
import BoatListingCard from "@/features/boats/components/BoatListingCard";
import SearchResultsFallback from "./SearchResultsFallback";
import { useSearchURL } from "@/features/search/hooks/useSearchURL";
import { usePagination } from "@/shared/lib/hooks/usePagination";
import { parseStringParam } from "@/shared/lib/utils/search-params-utils";
import { cn } from "@/shared/lib/utils/general-utils";
import type { BoatCard } from "@/features/boats/boat.types";

interface SearchResultsProps {
  initialResults: BoatCard[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  showMap?: boolean;
}

const SORT_OPTIONS = [
  { value: "featured", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "length_asc", label: "Length: Small to Large" },
  { value: "length_desc", label: "Length: Large to Small" },
  { value: "newest", label: "Newest First" },
] as const;

function SortDropdown({
  sortLabel,
  currentSort,
  onSort,
}: {
  sortLabel: string;
  currentSort: string;
  onSort: (sort: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-auto shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-foreground transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 data-[state=open]:border-gray-300 data-[state=open]:bg-gray-50 sm:h-10 sm:gap-2 sm:px-4"
          aria-label="Sort results"
        >
          <span className="max-w-[7.5rem] truncate sm:max-w-none">{sortLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-52 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg"
      >
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onSort(option.value)}
            className={cn(
              "cursor-pointer justify-between gap-2 rounded-xl px-3 py-2.5 text-sm outline-none focus:bg-gray-50",
              currentSort === option.value
                ? "font-medium text-primary"
                : "text-foreground",
            )}
          >
            {option.label}
            {currentSort === option.value ? (
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function SearchResults({
  initialResults,
  totalCount,
  currentPage,
  totalPages,
  showMap = false,
}: SearchResultsProps) {
  const { searchParams, isPending, updateSearchParams } = useSearchURL();

  const currentSort = useMemo(
    () => parseStringParam(searchParams.get("sort")) || "featured",
    [searchParams],
  );

  const locationLabel =
    parseStringParam(searchParams.get("near")) || "this location";

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Recommended";

  const handleSort = useCallback(
    (sort: string) => updateSearchParams({ sort, page: 1 }),
    [updateSearchParams],
  );

  const handlePageChange = useCallback(
    (page: number) => updateSearchParams({ page }),
    [updateSearchParams],
  );

  const { pages, hasNextPage, hasPreviousPage } = usePagination({
    currentPage,
    totalPages,
  });

  const gridCols = showMap
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-3 sm:space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Boat rentals &amp; charters in {locationLabel}
          </h1>

          <div className="flex items-center justify-between gap-3">
            {totalCount > 0 ? (
              <p className="min-w-0 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} · {totalCount} listing
                {totalCount !== 1 ? "s" : ""}
              </p>
            ) : (
              <span className="flex-1 sm:hidden" />
            )}
            <div className="shrink-0 sm:hidden">
              <SortDropdown
                sortLabel={sortLabel}
                currentSort={currentSort}
                onSort={handleSort}
              />
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <SortDropdown
            sortLabel={sortLabel}
            currentSort={currentSort}
            onSort={handleSort}
          />
        </div>
      </div>

      {/* Results */}
      {initialResults.length > 0 ? (
        <div className={cn("relative grid gap-x-5 gap-y-8", gridCols)}>
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {initialResults.map((boat, index) => (
            <BoatListingCard
              key={boat.id}
              boat={boat}
              index={index}
              size="sm"
            />
          ))}
        </div>
      ) : (
        <SearchResultsFallback />
      )}

      {totalPages > 1 && (
        <Pagination className="pt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/boats/search?page=${currentPage - 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (hasPreviousPage) handlePageChange(currentPage - 1);
                }}
                aria-disabled={!hasPreviousPage}
                className={
                  !hasPreviousPage ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>

            {pages.map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={`/boats/search?page=${page}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              }

              if (
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return null;
            })}

            <PaginationItem>
              <PaginationNext
                href={`/boats/search?page=${currentPage + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (hasNextPage) handlePageChange(currentPage + 1);
                }}
                aria-disabled={!hasNextPage}
                className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
