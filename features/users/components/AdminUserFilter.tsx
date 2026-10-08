"use client";

import { useQueryStates } from "nuqs";
import { Plus } from "lucide-react";
import { FilterSearch, SegmentedPills } from "@/shared/admin/filters";
import { Button } from "@/shared/components/ui/button";
import type { UserListView } from "@/features/users/user.validation";
import { userSearchParams } from "../searchParams";

const VIEWS: { value: UserListView | null; label: string }[] = [
  { value: null, label: "Everyone" },
  { value: "admin", label: "Admins" },
  { value: "broker", label: "Brokers" },
  { value: "owner", label: "Owners" },
  { value: "captain", label: "Captains" },
  { value: "crew", label: "Crew" },
  { value: "customer", label: "Customers" },
  { value: "deactivated", label: "Deactivated" },
];

/** Opens the Add user sheet. */
export function AddUserButton() {
  const [, setFilters] = useQueryStates(userSearchParams);
  return (
    <Button className="h-9 gap-1.5 rounded-full px-4 font-semibold" onClick={() => setFilters({ newUser: true }, { shallow: true })}>
      <Plus className="h-3.5 w-3.5" />
      Add user
    </Button>
  );
}

/** People list toolbar: search and who to show. */
export function AdminUserFilter() {
  const [filters, setFilters] = useQueryStates(userSearchParams, { clearOnDefault: true, shallow: false });

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4">
      <FilterSearch
        value={filters.search}
        onChange={(search) => setFilters({ search, page: 1 })}
        placeholder="Search by name, email or phone…"
      />

      <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none]">
        <SegmentedPills label="Show" options={VIEWS} value={filters.view} onChange={(view) => setFilters({ view, page: 1 })} />
      </div>
    </div>
  );
}
