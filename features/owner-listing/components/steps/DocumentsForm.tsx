"use client";

import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { listingStepHref } from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";
import { Field, fieldError } from "../fields";
import { StepFooter } from "../StepFooter";
import { useStepSave } from "../useStepSave";

const dateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export function DocumentsForm({ draft, advance }: { draft: ListingDraft; advance: boolean }) {
  const { save, pending, fieldErrors, formError } = useStepSave(draft.id, "documents", advance);
  const [values, setValues] = useState({
    hullId: draft.hullId ?? "",
    registrationNumber: draft.registrationNumber ?? "",
    insuranceInfo: draft.insuranceInfo ?? "",
    insuranceExpiry: dateInput(draft.insuranceExpiry),
  });
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Lock className="h-4 w-4" aria-hidden /> Never shown on your listing.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Hull ID (HIN)"
          htmlFor="hullId"
          hint="12 characters, on the starboard side of the transom."
          error={fieldError(fieldErrors, "hullId")}
        >
          <Input
            id="hullId"
            value={values.hullId}
            onChange={set("hullId")}
            maxLength={20}
            className="uppercase"
            placeholder="ABC12345D919"
          />
        </Field>
        <Field
          label="Registration or USCG number"
          htmlFor="registrationNumber"
          error={fieldError(fieldErrors, "registrationNumber")}
        >
          <Input
            id="registrationNumber"
            value={values.registrationNumber}
            onChange={set("registrationNumber")}
            maxLength={30}
            placeholder="FL 1234 AB"
          />
        </Field>
        <Field
          label="Insurance"
          htmlFor="insuranceInfo"
          hint="Carrier and policy number."
          error={fieldError(fieldErrors, "insuranceInfo")}
          className="sm:col-span-2"
        >
          <Input
            id="insuranceInfo"
            value={values.insuranceInfo}
            onChange={set("insuranceInfo")}
            maxLength={200}
            placeholder="Markel · Policy 123-456-789"
          />
        </Field>
        <Field
          label="Insurance expires"
          htmlFor="insuranceExpiry"
          optional
          error={fieldError(fieldErrors, "insuranceExpiry")}
        >
          <Input
            id="insuranceExpiry"
            type="date"
            value={values.insuranceExpiry}
            onChange={set("insuranceExpiry")}
          />
        </Field>
      </div>
      <p className="text-sm leading-6 text-slate-500">
        The team may ask for a copy of the registration and your insurance declarations page during
        review.
      </p>

      <StepFooter
        backHref={listingStepHref(draft.id, "rules")}
        pending={pending}
        label={advance ? "Save and continue" : "Save changes"}
        error={formError}
      />
    </form>
  );
}
