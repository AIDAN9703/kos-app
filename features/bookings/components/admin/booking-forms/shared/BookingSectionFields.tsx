"use client";

import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DateTimePicker } from "@/shared/components/ui/date-time-picker";
import { BoatSelect } from "@/features/boats/components/BoatSelect";
import { formatCurrency } from "@/shared/lib/utils/general-utils";
import {
  bookingInstantToDatetimeLocalInput,
  datetimeLocalInputToUtcISO,
} from "@/shared/lib/utils/date-helpers";
import type { BookingSectionData, PricingTierOption } from "../types";

/**
 * Keep the WALL TIME when the boat (and so the timezone) changes: an admin who
 * typed 8:00 for a Miami boat still means 8:00 after switching to a Chicago
 * one — the instant moves, the clock reading doesn't.
 */
export function reanchorWallTime(
  iso: string,
  fromTz: string | null,
  toTz: string | null
): string {
  if (!iso || fromTz === toTz) return iso;
  const wall = bookingInstantToDatetimeLocalInput(iso, fromTz);
  return datetimeLocalInputToUtcISO(wall, toTz) ?? iso;
}

function getDuration(start: string, end: string): { text: string; isError: boolean } {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return { text: "", isError: false };
  const diffMs = e.getTime() - s.getTime();
  if (diffMs < 0) return { text: "End date must be after start date", isError: true };
  const hours = diffMs / (1000 * 60 * 60);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return { text: `${m} min`, isError: false };
  return { text: m > 0 ? `${h} hr ${m} min` : `${h} hr`, isError: false };
}

interface BookingSectionFieldsProps {
  section: BookingSectionData;
  onChange: (updates: Partial<BookingSectionData>) => void;
  pricingTiers: PricingTierOption[];
  tiersByBoat: Record<string, PricingTierOption[]>;
  showSameDatesOption?: boolean;
  sameAsFirstBooking?: boolean;
  onSameDatesChange?: (checked: boolean) => void;
  useSharedDates?: boolean;
  sharedStartDateTime?: string;
  sharedEndDateTime?: string;
  onSharedStartChange?: (v: string) => void;
  onSharedEndChange?: (v: string) => void;
  index?: number;
}

export function BookingSectionFields({
  section,
  onChange,
  pricingTiers,
  tiersByBoat,
  showSameDatesOption = false,
  sameAsFirstBooking = false,
  onSameDatesChange,
  useSharedDates = false,
  sharedStartDateTime = "",
  sharedEndDateTime = "",
  onSharedStartChange,
  onSharedEndChange,
  index = 0,
}: BookingSectionFieldsProps) {
  const startDateTime = useSharedDates ? sharedStartDateTime : section.startDateTime;
  const endDateTime = useSharedDates ? sharedEndDateTime : section.endDateTime;
  const setStart = (v: string) =>
    useSharedDates ? onSharedStartChange?.(v) : onChange({ startDateTime: v });
  const setEnd = (v: string) =>
    useSharedDates ? onSharedEndChange?.(v) : onChange({ endDateTime: v });

  const selectedTier =
    section.usePricingTier && section.pricingTierId
      ? pricingTiers.find((t) => t.id === section.pricingTierId)
      : null;

  const toggleTier = (useTier: boolean) => {
    const tiers = tiersByBoat[section.boatId] || [];
    const defaultTier = tiers.find((t) => t.isDefault) ?? tiers[0];
    onChange({
      usePricingTier: useTier,
      pricingTierId: useTier ? (defaultTier?.id ?? "") : "",
      basePrice: useTier ? (defaultTier?.price ?? 0) : section.basePrice,
      endDateTime: useTier ? "" : section.endDateTime,
    });
  };

  const tierOptions = tiersByBoat[section.boatId] || [];
  const hasTiers = section.boatId && tierOptions.length > 0;
  // Trip times are entered in the BOAT's local time, never the browser's.
  const boatTimeZone = section.boat?.timezone ?? null;

  return (
    <div className="space-y-4">
      <div>
        <Label>Boat *</Label>
        <BoatSelect
          value={section.boatId}
          selectedBoat={section.boat}
          onChange={(boatId, boat) => {
            const tiers = tiersByBoat[boatId] || [];
            const defaultTier = tiers.find((t) => t.isDefault) ?? tiers[0];
            const nextTz = boat?.timezone ?? null;
            onChange({
              boatId,
              boat: boat ?? undefined,
              pricingTierId: section.usePricingTier ? (defaultTier?.id ?? "") : "",
              basePrice: section.usePricingTier ? (defaultTier?.price ?? 0) : section.basePrice,
              depositAmount: boat?.depositAmount ?? null,
              // Dates already typed keep their wall time under the new zone.
              ...(section.startDateTime
                ? {
                    startDateTime: reanchorWallTime(
                      section.startDateTime,
                      boatTimeZone,
                      nextTz
                    ),
                  }
                : {}),
              ...(section.endDateTime
                ? { endDateTime: reanchorWallTime(section.endDateTime, boatTimeZone, nextTz) }
                : {}),
            });
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`use-tier-${index}`}
            checked={section.usePricingTier}
            onCheckedChange={(c) => toggleTier(!!c)}
          />
          <Label htmlFor={`use-tier-${index}`} className="font-normal cursor-pointer">
            Use pricing tier
          </Label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="space-y-1.5">
            <Label>{section.usePricingTier ? "Tier" : "Base Price ($) *"}</Label>
            {section.usePricingTier ? (
              <Select
                value={section.pricingTierId}
                onValueChange={(tierId) => {
                  const tier = pricingTiers.find((t) => t.id === tierId);
                  onChange({ pricingTierId: tierId, basePrice: tier?.price ?? section.basePrice });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {tierOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name || `${t.hours} hrs`} · {formatCurrency(t.price)}
                    </SelectItem>
                  ))}
                  {!hasTiers && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Select boat first</div>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 450"
                className="h-9"
                value={section.basePrice || ""}
                onChange={(e) => onChange({ basePrice: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Deposit ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="h-9"
              placeholder={
                section.boat?.depositAmount != null
                  ? `Default: ${section.boat.depositAmount}`
                  : "Optional"
              }
              value={
                section.depositAmount != null && section.depositAmount > 0
                  ? section.depositAmount
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                onChange({ depositAmount: v === "" ? null : parseFloat(v) || 0 });
              }}
            />
          </div>
        </div>
      </div>

      {showSameDatesOption && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`same-dates-${index}`}
            checked={sameAsFirstBooking}
            onCheckedChange={(c) => onSameDatesChange?.(!!c)}
          />
          <Label htmlFor={`same-dates-${index}`} className="font-normal cursor-pointer">
            Same dates as first booking
          </Label>
        </div>
      )}

      {(!showSameDatesOption || !sameAsFirstBooking) && (
        <div className="space-y-2">
          <Label>
            Date &amp; Time
            {section.boatId ? (
              <span className="ml-2 font-normal text-muted-foreground">
                boat local time
              </span>
            ) : null}
          </Label>
          {section.usePricingTier ? (
            <div className="space-y-1">
              <DateTimePicker
                value={startDateTime}
                onChange={setStart}
                placeholder="Select start"
                timeZone={boatTimeZone}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-1">
                <Label className="text-xs font-normal">Start *</Label>
                <DateTimePicker
                  value={startDateTime}
                  onChange={setStart}
                  placeholder="Select start"
                  timeZone={boatTimeZone}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-normal">End *</Label>
                <DateTimePicker
                  value={endDateTime}
                  onChange={setEnd}
                  placeholder="Select end"
                  timeZone={boatTimeZone}
                />
              </div>
            </div>
          )}
          {section.usePricingTier && selectedTier && (
            <p className="text-sm font-medium text-muted-foreground">
              Duration: {selectedTier.hours} hr{selectedTier.hours !== 1 ? "s" : ""} (from tier)
            </p>
          )}
          {!section.usePricingTier && startDateTime && endDateTime && (() => {
            const { text, isError } = getDuration(startDateTime, endDateTime);
            if (!text) return null;
            return (
              <p
                className={
                  isError
                    ? "text-sm font-medium text-destructive"
                    : "text-sm font-medium text-muted-foreground"
                }
              >
                {isError ? text : `Duration: ${text}`}
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
