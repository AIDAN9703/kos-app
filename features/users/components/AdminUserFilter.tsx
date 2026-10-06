"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Plus, ShieldCheck } from "lucide-react";
import {
  AdminToolbar,
  FilterChips,
  FilterField,
  FilterPopover,
  FilterSearch,
  type FilterChipItem,
} from "@/shared/admin/filters";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { userSearchParams } from "../searchParams";

export function AdminUserFilter() {
  const [filters, setFilters] = useQueryStates(userSearchParams, {
    clearOnDefault: true,
    shallow: false,
  });

  const updateFilter = (updates: Partial<typeof filters>) => {
    setFilters({ ...updates, page: 1 });
  };

  const activeCount = useMemo(
    () => (filters.isAdmin === true ? 1 : 0),
    [filters.isAdmin]
  );

  const clearAll = () => {
    setFilters({ search: "", isAdmin: null, page: 1 });
  };

  const chips: FilterChipItem[] = [];
  if (filters.isAdmin === true) {
    chips.push({
      key: "isAdmin",
      label: "Admins only",
      onRemove: () => updateFilter({ isAdmin: null }),
    });
  }

  return (
    <div className="space-y-2 pb-3">
      <AdminToolbar
        trailing={
          <Button asChild size="sm" className="h-9 gap-1.5">
            <Link href="/admin/users/create">
              <Plus className="h-3.5 w-3.5" />
              Add user
            </Link>
          </Button>
        }
      >
        <FilterSearch
          value={filters.search}
          onChange={(v) => updateFilter({ search: v })}
          placeholder="Search by name, email, or username..."
        />
        <FilterPopover activeCount={activeCount} onClearAll={clearAll}>
          <FilterField icon={ShieldCheck} label="Role" className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={filters.isAdmin === true}
                onCheckedChange={(checked) =>
                  updateFilter({ isAdmin: checked ? true : null })
                }
              />
              Admins only
            </label>
          </FilterField>
        </FilterPopover>
      </AdminToolbar>

      <FilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
}
