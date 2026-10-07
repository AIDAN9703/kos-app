"use client";

import { useQueryStates } from "nuqs";
import { Plus } from "lucide-react";
import { AdminToolbar, FilterSearch } from "@/shared/admin/filters";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/general-utils";
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

/** People list toolbar: search, who to show, and Add user (opens the sheet). */
export function AdminUserFilter() {
  const [filters, setFilters] = useQueryStates(userSearchParams, { clearOnDefault: true, shallow: false });

  return (
    <div className="space-y-3 pb-3">
      <AdminToolbar
        trailing={
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setFilters({ newUser: true }, { shallow: true })}>
            <Plus className="h-3.5 w-3.5" />
            Add user
          </Button>
        }
      >
        <FilterSearch
          value={filters.search}
          onChange={(search) => setFilters({ search, page: 1 })}
          placeholder="Search by name, email or phone…"
        />
      </AdminToolbar>

      <div className="-mx-1 overflow-x-auto px-1">
        <div role="tablist" aria-label="Show" className="inline-flex h-10 items-center rounded-full bg-muted p-1">
          {VIEWS.map(({ value, label }) => {
            const active = filters.view === value;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilters({ view: value, page: 1 })}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
