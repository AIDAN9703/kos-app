"use client";

import { useMemo } from "react";
import { useQueryStates } from "nuqs";
import {
  Anchor,
  Calendar,
  DollarSign,
  Home,
  MapPin,
  Ruler,
  Ship,
  Users,
  Waves,
} from "lucide-react";
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
import { boatSearchParams } from "../searchParams";
import { boatCategoryEnum } from "@/database/schema";
import { Input } from "@/shared/components/ui/input";

const categoryLabel = (v: string) =>
  v
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Which boats to show: every boat, listed or hidden on the site, or featured. */
type BoatView = "all" | "listed" | "hidden" | "featured";

const VIEWS: { value: BoatView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "listed", label: "Listed" },
  { value: "hidden", label: "Hidden" },
  { value: "featured", label: "Featured" },
];

const rangeLabel = (
  min: number | null | undefined,
  max: number | null | undefined,
  prefix = ""
) =>
  `${prefix}${min ?? 0}${max != null ? ` – ${prefix}${max}` : "+"}`;

/** Boats toolbar: search, which boats to show, and the Filters popover. */
export function AdminBoatFilter() {
  const [filters, setFilters] = useQueryStates(boatSearchParams, {
    clearOnDefault: true,
    shallow: false,
  });

  const updateFilter = (updates: Partial<typeof filters>) => {
    setFilters({ ...updates, page: 1 });
  };

  const view: BoatView =
    filters.featured === true ? "featured" : filters.active === true ? "listed" : filters.active === false ? "hidden" : "all";
  const setView = (next: BoatView) =>
    updateFilter({
      active: next === "listed" ? true : next === "hidden" ? false : null,
      featured: next === "featured" ? true : null,
    });

  const activeCount = useMemo(
    () =>
      [
        filters.category,
        filters.minPrice ?? filters.maxPrice,
        filters.minLength ?? filters.maxLength,
        filters.minCapacity ?? filters.maxCapacity,
        filters.minYear ?? filters.maxYear,
        filters.minSleeps,
        filters.minBathrooms,
        filters.locationLabel,
        filters.crewRequired,
        filters.instantBook,
        filters.dayCharter,
        filters.termCharter,
      ].filter((v) => v !== undefined && v !== null).length,
    [filters]
  );

  const clearAll = () => {
    setFilters({
      search: "",
      category: null,
      minPrice: null,
      maxPrice: null,
      minLength: null,
      maxLength: null,
      minCapacity: null,
      maxCapacity: null,
      minYear: null,
      maxYear: null,
      minSleeps: null,
      minBathrooms: null,
      locationLabel: null,
      crewRequired: null,
      instantBook: null,
      dayCharter: null,
      termCharter: null,
      page: 1,
    });
  };

  const chips: FilterChipItem[] = [];
  if (filters.category)
    chips.push({
      key: "category",
      label: `Category: ${categoryLabel(filters.category)}`,
      onRemove: () => updateFilter({ category: null }),
    });
  if (filters.minPrice != null || filters.maxPrice != null)
    chips.push({
      key: "price",
      label: `Price: ${rangeLabel(filters.minPrice, filters.maxPrice, "$")}`,
      onRemove: () => updateFilter({ minPrice: null, maxPrice: null }),
    });
  if (filters.minLength != null || filters.maxLength != null)
    chips.push({
      key: "length",
      label: `Length: ${rangeLabel(filters.minLength, filters.maxLength)} ft`,
      onRemove: () => updateFilter({ minLength: null, maxLength: null }),
    });
  if (filters.minCapacity != null || filters.maxCapacity != null)
    chips.push({
      key: "capacity",
      label: `Capacity: ${rangeLabel(filters.minCapacity, filters.maxCapacity)}`,
      onRemove: () => updateFilter({ minCapacity: null, maxCapacity: null }),
    });
  if (filters.minYear != null || filters.maxYear != null)
    chips.push({
      key: "year",
      label: `Year: ${rangeLabel(filters.minYear, filters.maxYear)}`,
      onRemove: () => updateFilter({ minYear: null, maxYear: null }),
    });
  if (filters.minSleeps != null)
    chips.push({
      key: "sleeps",
      label: `Sleeps ${filters.minSleeps}+`,
      onRemove: () => updateFilter({ minSleeps: null }),
    });
  if (filters.minBathrooms != null)
    chips.push({
      key: "bathrooms",
      label: `Bathrooms ${filters.minBathrooms}+`,
      onRemove: () => updateFilter({ minBathrooms: null }),
    });
  if (filters.locationLabel)
    chips.push({
      key: "location",
      label: `Location: ${filters.locationLabel}`,
      onRemove: () => updateFilter({ locationLabel: null }),
    });
  if (filters.crewRequired !== null)
    chips.push({
      key: "crew",
      label: `Crew: ${filters.crewRequired ? "Required" : "Not required"}`,
      onRemove: () => updateFilter({ crewRequired: null }),
    });
  if (filters.instantBook !== null)
    chips.push({
      key: "instantBook",
      label: `Instant book: ${filters.instantBook ? "Yes" : "No"}`,
      onRemove: () => updateFilter({ instantBook: null }),
    });
  if (filters.dayCharter !== null)
    chips.push({
      key: "dayCharter",
      label: `Day charter: ${filters.dayCharter ? "Yes" : "No"}`,
      onRemove: () => updateFilter({ dayCharter: null }),
    });
  if (filters.termCharter !== null)
    chips.push({
      key: "termCharter",
      label: `Term charter: ${filters.termCharter ? "Yes" : "No"}`,
      onRemove: () => updateFilter({ termCharter: null }),
    });

  return (
    <div className="space-y-3 pb-4">
      <AdminToolbar className="gap-3">
        <FilterSearch
          value={filters.search}
          onChange={(v) => updateFilter({ search: v })}
          placeholder="Search by name, make, model, location, owner..."
        />
        <SegmentedPills label="Show" options={VIEWS} value={view} onChange={setView} />
        <FilterPopover activeCount={activeCount} onClearAll={clearAll}>
          <FilterField icon={Ship} label="Category">
            <FilterSelect
              value={filters.category ?? null}
              onChange={(v) => updateFilter({ category: v })}
              options={boatCategoryEnum.enumValues}
              placeholder="Category"
              allLabel="Any category"
              width="w-full"
              renderLabel={categoryLabel}
            />
          </FilterField>
          <FilterField icon={MapPin} label="Location">
            <Input
              placeholder="City or region..."
              value={filters.locationLabel ?? ""}
              onChange={(e) => updateFilter({ locationLabel: e.target.value || null })}
              className="h-9 text-sm"
            />
          </FilterField>
          <FilterField icon={DollarSign} label="Price range">
            <RangeInputs
              min={filters.minPrice}
              max={filters.maxPrice}
              onMin={(v) => updateFilter({ minPrice: v })}
              onMax={(v) => updateFilter({ maxPrice: v })}
            />
          </FilterField>
          <FilterField icon={Ruler} label="Length (ft)">
            <RangeInputs
              min={filters.minLength}
              max={filters.maxLength}
              onMin={(v) => updateFilter({ minLength: v })}
              onMax={(v) => updateFilter({ maxLength: v })}
            />
          </FilterField>
          <FilterField icon={Users} label="Capacity">
            <RangeInputs
              min={filters.minCapacity}
              max={filters.maxCapacity}
              onMin={(v) => updateFilter({ minCapacity: v })}
              onMax={(v) => updateFilter({ maxCapacity: v })}
            />
          </FilterField>
          <FilterField icon={Calendar} label="Year built">
            <RangeInputs
              min={filters.minYear}
              max={filters.maxYear}
              minPlaceholder="From"
              maxPlaceholder="To"
              onMin={(v) => updateFilter({ minYear: v })}
              onMax={(v) => updateFilter({ maxYear: v })}
            />
          </FilterField>
          <FilterField icon={Home} label="Sleeps (min)">
            <Input
              type="number"
              min={0}
              placeholder="Minimum"
              value={filters.minSleeps ?? ""}
              onChange={(e) =>
                updateFilter({
                  minSleeps: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="h-9 text-sm"
            />
          </FilterField>
          <FilterField icon={Waves} label="Bathrooms (min)">
            <Input
              type="number"
              min={0}
              placeholder="Minimum"
              value={filters.minBathrooms ?? ""}
              onChange={(e) =>
                updateFilter({
                  minBathrooms: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="h-9 text-sm"
            />
          </FilterField>
          <FilterField icon={Anchor} label="Charter options" className="sm:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BoolSelect
                label="Crew"
                value={filters.crewRequired}
                yesLabel="Required"
                noLabel="Not required"
                onChange={(v) => updateFilter({ crewRequired: v })}
              />
              <BoolSelect
                label="Instant book"
                value={filters.instantBook}
                onChange={(v) => updateFilter({ instantBook: v })}
              />
              <BoolSelect
                label="Day charter"
                value={filters.dayCharter}
                yesLabel="Available"
                noLabel="Not available"
                onChange={(v) => updateFilter({ dayCharter: v })}
              />
              <BoolSelect
                label="Term charter"
                value={filters.termCharter}
                yesLabel="Available"
                noLabel="Not available"
                onChange={(v) => updateFilter({ termCharter: v })}
              />
            </div>
          </FilterField>
        </FilterPopover>
      </AdminToolbar>

      <FilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
}

function RangeInputs({
  min,
  max,
  onMin,
  onMax,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
}: {
  min: number | null | undefined;
  max: number | null | undefined;
  onMin: (v: number | null) => void;
  onMax: (v: number | null) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        type="number"
        min={0}
        placeholder={minPlaceholder}
        value={min ?? ""}
        onChange={(e) => onMin(e.target.value ? parseInt(e.target.value, 10) : null)}
        className="h-9 text-sm"
      />
      <Input
        type="number"
        min={0}
        placeholder={maxPlaceholder}
        value={max ?? ""}
        onChange={(e) => onMax(e.target.value ? parseInt(e.target.value, 10) : null)}
        className="h-9 text-sm"
      />
    </div>
  );
}

function BoolSelect({
  label,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <FilterSelect
        value={value === true ? "yes" : value === false ? "no" : null}
        onChange={(v) => onChange(v === "yes" ? true : v === "no" ? false : null)}
        options={["yes", "no"]}
        placeholder={label}
        allLabel="Any"
        width="w-full"
        renderLabel={(v) => (v === "yes" ? yesLabel : noLabel)}
      />
    </div>
  );
}
