"use client";

import { useQueryStates } from "nuqs";
import { FilterSearch, SegmentedPills } from "@/shared/admin/filters";
import type { BlogStatus } from "@/features/blog/blog.types";
import { blogSearchParams } from "@/features/blog/searchParams";

/** Each view is a status, or every featured post whatever its status. */
const VIEWS: { label: string; status: BlogStatus | null; featured: boolean | null }[] = [
  { label: "All", status: null, featured: null },
  { label: "Published", status: "PUBLISHED", featured: null },
  { label: "Drafts", status: "DRAFT", featured: null },
  { label: "Scheduled", status: "SCHEDULED", featured: null },
  { label: "Archived", status: "ARCHIVED", featured: null },
  { label: "Featured", status: null, featured: true },
];

/** Posts toolbar: search and which posts to show. */
export function AdminBlogFilter() {
  const [filters, setFilters] = useQueryStates(blogSearchParams, { clearOnDefault: true, shallow: false });
  const current = VIEWS.find((v) => v.status === filters.status && v.featured === filters.featured) ?? VIEWS[0];

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4">
      <FilterSearch
        value={filters.search}
        onChange={(search) => setFilters({ search, page: 1 })}
        placeholder="Search posts…"
      />
      <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none]">
        <SegmentedPills
          label="Show"
          options={VIEWS.map((view) => ({ value: view.label, label: view.label }))}
          value={current.label}
          onChange={(label) => {
            const view = VIEWS.find((v) => v.label === label) ?? VIEWS[0];
            setFilters({ status: view.status, featured: view.featured, page: 1 });
          }}
        />
      </div>
    </div>
  );
}
