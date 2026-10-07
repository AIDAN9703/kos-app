"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { convertBoatDateTimeToUTC, formatBoatLocal } from "@/shared/lib/utils/date-helpers";

import { cn } from "@/shared/lib/utils/general-utils";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Label } from "@/shared/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface DateTimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  /**
   * The BOAT's IANA zone. What the user types is that boat's wall-clock time —
   * never the browser's — so an admin in another timezone books the hour the
   * captain actually expects. Falls back to the fleet default when unset.
   */
  timeZone?: string | null;
}

export function DateTimePicker({
  value,
  onChange,
  name,
  placeholder = "Pick a date and time",
  required,
  disabled,
  className,
  id,
  timeZone,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState("09:00");
  const date = value ? new Date(value) : undefined;
  const isValid = date && !isNaN(date.getTime());
  // Boat-local wall clock for the stored instant (e.g. "2026-08-17", "08:00").
  const boatDateStr = isValid ? formatBoatLocal(date!, timeZone, "yyyy-MM-dd") : "";
  const boatTimeStr = isValid ? formatBoatLocal(date!, timeZone, "HH:mm") : "";
  const zoneLabel = formatBoatLocal(date ?? new Date(), timeZone, "zzz");

  React.useEffect(() => {
    if (!boatTimeStr) return;
    const [hh, mm] = boatTimeStr.split(":").map(Number);
    const snapped = Math.round(mm / 30) * 30;
    const h = snapped === 60 ? hh + 1 : hh;
    const m = snapped === 60 ? 0 : snapped;
    setTime(`${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }, [boatTimeStr]);

  /** dateStr is a plain calendar day; both are read as the BOAT's wall clock. */
  const apply = (dateStr: string, t: string) => {
    const iso = convertBoatDateTimeToUTC(dateStr, t, timeZone ?? null);
    if (iso) onChange?.(iso);
  };

  const onDateSelect = (d: Date | undefined) => {
    if (!d) return;
    // The calendar hands back local midnight — take its calendar fields as-is.
    apply(format(d, "yyyy-MM-dd"), time);
  };

  const onTimeSelect = (t: string) => {
    setTime(t);
    apply(boatDateStr || format(new Date(), "yyyy-MM-dd"), t);
  };

  const display = isValid
    ? `${formatBoatLocal(date!, timeZone, "MMM d, yyyy")} at ${to12Hour(time)} ${zoneLabel}`
    : placeholder;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !isValid && "text-muted-foreground"
            )}
          >
            {display}
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="overflow-hidden p-0"
          align="start"
          style={{ width: 280, maxWidth: "calc(100vw - 2rem)" }}
        >
          <Calendar
            mode="single"
            navLayout="around"
            selected={boatDateStr ? new Date(`${boatDateStr}T00:00:00`) : undefined}
            onSelect={onDateSelect}
            initialFocus
          />
          <div className="border-t p-3">
            <Label
              htmlFor={id ? `${id}-time` : undefined}
              className="mb-2 block px-1 text-sm"
            >
              Time
            </Label>
            <Select value={time} onValueChange={onTimeSelect}>
              <SelectTrigger id={id ? `${id}-time` : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {to12Hour(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
      <input
        type="hidden"
        name={name}
        value={value ?? ""}
        required={required}
        readOnly
      />
    </div>
  );
}
