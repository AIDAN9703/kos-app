"use client";

import { useQueryStates } from "nuqs";
import { FilterSearch, FilterSelect, SegmentedPills } from "@/shared/admin/filters";
import { contactSearchParams, type CONTACT_FILTERS } from "@/features/marketing/searchParams";

const FILTERS: { value: (typeof CONTACT_FILTERS)[number] | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "pending", label: "Waiting to sync" },
];

/** Search, which list, and which contacts. */
export function ContactsToolbar({ lists }: { lists: string[] }) {
  const [filters, setFilters] = useQueryStates(contactSearchParams, { clearOnDefault: true, shallow: false });
  return (
    <div className="flex flex-wrap items-center gap-3 pb-4">
      <FilterSearch
        value={filters.search}
        onChange={(search) => setFilters({ search, page: 1 })}
        placeholder="Search by email or name…"
      />
      <FilterSelect
        value={filters.list}
        onChange={(list) => setFilters({ list, page: 1 })}
        options={lists}
        placeholder="List"
        allLabel="Every list"
        width="w-[180px]"
        renderLabel={(v) => v}
      />
      <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none]">
        <SegmentedPills label="Show" options={FILTERS} value={filters.filter} onChange={(filter) => setFilters({ filter, page: 1 })} />
      </div>
    </div>
  );
}
