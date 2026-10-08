"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ADMIN_LIST_PAGE_SIZES } from "@/shared/admin/list-pagination";

interface AdminListPaginationProps {
  totalCount: number;
  totalPages: number;
  page: number;
  limit: number;
  entityLabel?: string;
  pageSizes?: readonly number[];
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/**
 * Detached, frosted pagination bar for <AdminListShell>.
 * URL updates are handled by the parent via onPageChange / onLimitChange.
 */
export function AdminListPagination({
  totalCount,
  totalPages,
  page,
  limit,
  entityLabel = "items",
  pageSizes = ADMIN_LIST_PAGE_SIZES,
  onPageChange,
  onLimitChange,
}: AdminListPaginationProps) {
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, totalCount);
  const showNav = totalPages > 1;

  const goTo = (newPage: number) =>
    onPageChange(Math.min(Math.max(1, newPage), totalPages));

  return (
    <div className="shrink-0 pt-3">
      <div className="glass-panel flex items-center justify-between gap-4 rounded-2xl py-2 pl-5 pr-2.5">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0 ? (
            `No ${entityLabel}`
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalCount.toLocaleString()}
              </span>{" "}
              <span className="hidden sm:inline">{entityLabel}</span>
            </>
          )}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Per page
            </span>
            <Select
              value={String(limit)}
              onValueChange={(v) => onLimitChange(Number(v))}
            >
              <SelectTrigger className="h-9 w-[72px] rounded-full border-glass-border bg-glass-inset" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showNav ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="glass"
                size="sm"
                className="h-9 w-9 p-0"
                disabled={page <= 1}
                onClick={() => goTo(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[84px] text-center text-sm tabular-nums text-foreground">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="glass"
                size="sm"
                className="h-9 w-9 p-0"
                disabled={page >= totalPages}
                onClick={() => goTo(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
