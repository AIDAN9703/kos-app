"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { LISTING_TIMEZONES, listingStepHref } from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";
import { Field, fieldError } from "../fields";
import { StepFooter } from "../StepFooter";
import { useStepSave } from "../useStepSave";
import { usePreviewPatch } from "../preview/ListingPreview";

export function LocationForm({ draft, advance }: { draft: ListingDraft; advance: boolean }) {
  const { save, pending, fieldErrors, formError } = useStepSave(draft.id, "location", advance);
  const [values, setValues] = useState({
    locationLabel: draft.locationLabel ?? "",
    dockInfo: draft.dockInfo ?? "",
    parkingInfo: draft.parkingInfo ?? "",
    timezone: LISTING_TIMEZONES.some((t) => t.value === draft.timezone)
      ? draft.timezone!
      : "America/New_York",
  });
  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const patch = usePreviewPatch();
  useEffect(() => patch({ locationLabel: values.locationLabel }), [values.locationLabel, patch]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      <Field
        label="Marina or dock"
        htmlFor="locationLabel"
        hint="Guests see this on your listing."
        error={fieldError(fieldErrors, "locationLabel")}
      >
        <Input
          id="locationLabel"
          value={values.locationLabel}
          onChange={set("locationLabel")}
          placeholder="Miami Beach Marina, Miami Beach, FL"
        />
      </Field>
      <Field
        label="Boarding details"
        htmlFor="dockInfo"
        optional
        hint="Slip number, gate code, where to meet. Sent to guests once they've booked."
        error={fieldError(fieldErrors, "dockInfo")}
      >
        <Textarea
          id="dockInfo"
          rows={3}
          value={values.dockInfo}
          onChange={set("dockInfo")}
          placeholder="Slip C-14. Meet at the dockmaster's office."
        />
      </Field>
      <Field
        label="Parking"
        htmlFor="parkingInfo"
        optional
        error={fieldError(fieldErrors, "parkingInfo")}
      >
        <Textarea
          id="parkingInfo"
          rows={2}
          value={values.parkingInfo}
          onChange={set("parkingInfo")}
          placeholder="Paid garage across the street, about $20 for the day."
        />
      </Field>
      <Field
        label="Local time zone"
        htmlFor="timezone"
        hint="Trip times are shown in the boat's local time."
      >
        <select
          id="timezone"
          value={values.timezone}
          onChange={set("timezone")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {LISTING_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </Field>
      <StepFooter
        backHref={listingStepHref(draft.id, "basics")}
        pending={pending}
        label={advance ? "Save and continue" : "Save changes"}
        error={formError}
      />
    </form>
  );
}
