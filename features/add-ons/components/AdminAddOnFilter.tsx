"use client";

import { useMemo, useState } from "react";
import { useQueryStates } from "nuqs";
import { Plus, Tag } from "lucide-react";

import { addOnCategoryEnum } from "@/database/schema";
import { addOnSearchParams } from "@/features/add-ons/searchParams";
import {
  AdminToolbar,
  FilterChips,
  FilterField,
  FilterPopover,
  FilterSearch,
  FilterSelect,
  SegmentedPills,
  type FilterChipItem,
} from "@/shared/admin/filters";
import { Button } from "@/shared/components/ui/button";
import { addOnCategoryLabel } from "@/features/add-ons/add-on.constants";
import { AddOnFormModal } from "@/features/add-ons/components/AddOnFormModal";
import type { AddOnCategory } from "@/features/add-ons/add-on.types";

type StatusView = "all" | "active" | "inactive";

const VIEWS: { value: StatusView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** The header's New add-on button: opens the add-on form. */
export function NewAddOnButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="h-9 gap-1.5 rounded-full px-4 font-semibold" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        New add-on
      </Button>
      <AddOnFormModal open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Add-ons toolbar: search, which add-ons to show, and the category filter. */
export function AdminAddOnFilter() {
  const [filters, setFilters] = useQueryStates(addOnSearchParams, {
    clearOnDefault: true,
    shallow: false,
  });

  const update = (updates: Partial<typeof filters>) => setFilters({ ...updates, page: 1 });
  const view: StatusView = filters.active === true ? "active" : filters.active === false ? "inactive" : "all";

  const activeCount = useMemo(() => (filters.category ? 1 : 0), [filters.category]);
  const clearAll = () => setFilters({ search: "", category: null, page: 1 });

  const chips: FilterChipItem[] = [];
  if (filters.category) {
    chips.push({
      key: "category",
      label: `Category: ${addOnCategoryLabel(filters.category as AddOnCategory)}`,
      onRemove: () => update({ category: null }),
    });
  }

  return (
    <div className="space-y-3 pb-4">
      <AdminToolbar className="gap-3">
        <FilterSearch value={filters.search} onChange={(v) => update({ search: v })} placeholder="Search add-ons..." />
        <SegmentedPills
          label="Show"
          options={VIEWS}
          value={view}
          onChange={(next) => update({ active: next === "active" ? true : next === "inactive" ? false : null })}
        />
        <FilterPopover activeCount={activeCount} onClearAll={clearAll}>
          <FilterField icon={Tag} label="Category">
            <FilterSelect<AddOnCategory>
              value={(filters.category as AddOnCategory) ?? null}
              onChange={(v) => update({ category: v })}
              options={addOnCategoryEnum.enumValues as readonly AddOnCategory[]}
              placeholder="Category"
              allLabel="Any category"
              width="w-full"
              renderLabel={addOnCategoryLabel}
            />
          </FilterField>
        </FilterPopover>
      </AdminToolbar>

      <FilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
}
