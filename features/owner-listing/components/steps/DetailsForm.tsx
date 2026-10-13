"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { MIN_DESCRIPTION } from "../../listing-progress";
import { AMENITIES, defaultListingName, listingStepHref } from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";
import { Counter, Field, fieldError } from "../fields";
import { StepFooter } from "../StepFooter";
import { useStepSave } from "../useStepSave";
import { usePreviewPatch } from "../preview/ListingPreview";

const KNOWN = new Set<string>(AMENITIES);

export function DetailsForm({ draft, advance }: { draft: ListingDraft; advance: boolean }) {
  const { save, pending, fieldErrors, formError } = useStepSave(draft.id, "details", advance);
  const autoName = defaultListingName(draft);
  const [values, setValues] = useState({
    displayTitle: draft.displayTitle ?? "",
    name: draft.name === autoName ? "" : draft.name,
    description: draft.description ?? "",
    sleeps: draft.sleeps?.toString() ?? "",
    bathrooms: draft.bathrooms?.toString() ?? "",
  });
  const [features, setFeatures] = useState<string[]>(draft.features);
  const [custom, setCustom] = useState("");
  const set =
    (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const toggle = (feature: string) =>
    setFeatures((list) =>
      list.includes(feature) ? list.filter((f) => f !== feature) : [...list, feature]
    );
  const addCustom = () => {
    const value = custom.trim();
    if (value.length >= 2 && !features.includes(value)) setFeatures((list) => [...list, value]);
    setCustom("");
  };

  const patch = usePreviewPatch();
  useEffect(() => patch({ displayTitle: values.displayTitle }), [values.displayTitle, patch]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save({
      ...values,
      sleeps: values.sleeps || null,
      bathrooms: values.bathrooms || null,
      features,
    });
  }

  const extras = features.filter((f) => !KNOWN.has(f));

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <Field
        label="Listing title"
        htmlFor="displayTitle"
        error={fieldError(fieldErrors, "displayTitle")}
        hint={<Counter value={values.displayTitle} max={60} />}
      >
        <Input
          id="displayTitle"
          value={values.displayTitle}
          onChange={set("displayTitle")}
          maxLength={60}
          placeholder="55' Azimut with flybridge on Biscayne Bay"
        />
      </Field>

      <Field
        label="Boat's name"
        htmlFor="name"
        optional
        hint="If it has one painted on the transom."
      >
        <Input
          id="name"
          value={values.name}
          onChange={set("name")}
          maxLength={40}
          placeholder="Sea Breeze"
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={fieldError(fieldErrors, "description")}
        hint={<Counter value={values.description} max={3000} min={MIN_DESCRIPTION} />}
      >
        <Textarea
          id="description"
          rows={7}
          value={values.description}
          onChange={set("description")}
          maxLength={3000}
          placeholder="What's a day aboard like? Where do you take guests, what's on board, what makes this boat the one to pick?"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">What&apos;s on board</legend>
        <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {AMENITIES.map((amenity, i) => (
            <div key={amenity} className="flex items-center gap-3">
              <Checkbox
                id={`amenity-${i}`}
                checked={features.includes(amenity)}
                onCheckedChange={() => toggle(amenity)}
              />
              <label htmlFor={`amenity-${i}`} className="cursor-pointer text-[15px] text-slate-700">
                {amenity}
              </label>
            </div>
          ))}
        </div>
        {extras.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {extras.map((f) => (
              <li
                key={f}
                className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1.5 pl-3 text-sm text-slate-700"
              >
                {f}
                <button
                  type="button"
                  onClick={() => toggle(f)}
                  aria-label={`Remove ${f}`}
                  className="rounded-full p-0.5 hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add something else, e.g. Seabob"
            maxLength={80}
          />
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.06] px-4 text-sm font-semibold text-primary hover:bg-foreground/10"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Sleeps" htmlFor="sleeps" optional>
          <Input
            id="sleeps"
            inputMode="numeric"
            value={values.sleeps}
            onChange={set("sleeps")}
            placeholder="4"
          />
        </Field>
        <Field label="Bathrooms" htmlFor="bathrooms" optional>
          <Input
            id="bathrooms"
            inputMode="numeric"
            value={values.bathrooms}
            onChange={set("bathrooms")}
            placeholder="2"
          />
        </Field>
      </div>

      <StepFooter
        backHref={listingStepHref(draft.id, "photos")}
        pending={pending}
        label={advance ? "Save and continue" : "Save changes"}
        error={formError}
      />
    </form>
  );
}
