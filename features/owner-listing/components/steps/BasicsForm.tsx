"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@/shared/components/ui/input";
import { BUILD_YEARS, LISTING_BOAT_TYPES } from "../../listing.constants";
import {
  MakePicker,
  ModelPicker,
  modelForMake,
} from "@/features/boat-catalog/components/CatalogPicker";
import type { CatalogMake } from "@/features/boat-catalog/boat-catalog.types";
import type { BasicsValues } from "../../basics-values";
import { ChoiceCard, Field, fieldError } from "../fields";
import { StepFooter } from "../StepFooter";
import { usePreviewPatch } from "../preview/ListingPreview";

export type { BasicsValues };

/** Type, make, model, year, length, guests. The first step, and editable later. */
export function BasicsForm({
  catalog,
  initial,
  onSubmit,
  pending,
  fieldErrors,
  formError,
  submitLabel,
  backHref,
}: {
  /** Makes and models for the pickers. */
  catalog: CatalogMake[];
  initial: BasicsValues;
  onSubmit: (values: BasicsValues) => void;
  pending: boolean;
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  submitLabel: string;
  backHref?: string | null;
}) {
  const [values, setValues] = useState(initial);
  const set =
    (key: keyof BasicsValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  // The preview card beside the flow follows the answers.
  const patch = usePreviewPatch();
  useEffect(() => patch(values), [values, patch]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">What kind of boat is it?</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {LISTING_BOAT_TYPES.map((type) => (
            <ChoiceCard
              key={type.value}
              name="category"
              title={type.label}
              selected={values.category === type.value}
              onSelect={() => setValues((v) => ({ ...v, category: type.value }))}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Make" htmlFor="make" error={fieldError(fieldErrors, "make")}>
          <MakePicker
            id="make"
            mode="other"
            catalog={catalog}
            value={values.make}
            // A new make starts its model over.
            onChange={(make) => setValues((v) => ({ ...v, make, model: modelForMake(make, v) }))}
            invalid={Boolean(fieldError(fieldErrors, "make"))}
            className="h-10"
          />
        </Field>
        <Field label="Model" htmlFor="model" error={fieldError(fieldErrors, "model")}>
          <ModelPicker
            id="model"
            mode="other"
            catalog={catalog}
            make={values.make}
            value={values.model}
            onChange={(model) => setValues((v) => ({ ...v, model }))}
            invalid={Boolean(fieldError(fieldErrors, "model"))}
            className="h-10"
          />
        </Field>
        <Field label="Year built" htmlFor="yearBuilt" error={fieldError(fieldErrors, "yearBuilt")}>
          <select
            id="yearBuilt"
            value={values.yearBuilt}
            onChange={set("yearBuilt")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Choose the year</option>
            {BUILD_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Length (ft)" htmlFor="lengthFt" error={fieldError(fieldErrors, "lengthFt")}>
          <Input
            id="lengthFt"
            inputMode="numeric"
            value={values.lengthFt}
            onChange={set("lengthFt")}
            placeholder="55"
          />
        </Field>
        <Field
          label="Guests allowed"
          htmlFor="capacity"
          error={fieldError(fieldErrors, "capacity")}
          hint="Not counting crew, per the boat's rating."
        >
          <Input
            id="capacity"
            inputMode="numeric"
            value={values.capacity}
            onChange={set("capacity")}
            placeholder="12"
          />
        </Field>
      </div>

      <StepFooter backHref={backHref} pending={pending} label={submitLabel} error={formError} />
    </form>
  );
}
