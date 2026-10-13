"use client";

import { useState, type FormEvent } from "react";
import { Textarea } from "@/shared/components/ui/textarea";
import { CANCELLATION_POLICIES, listingStepHref } from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";
import { ChoiceCard, Field, fieldError } from "../fields";
import { StepFooter } from "../StepFooter";
import { useStepSave } from "../useStepSave";

export function RulesForm({ draft, advance }: { draft: ListingDraft; advance: boolean }) {
  const { save, pending, fieldErrors, formError } = useStepSave(draft.id, "rules", advance);
  const [policy, setPolicy] = useState(draft.cancellationPolicy ?? "");
  const [rules, setRules] = useState(draft.rules ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save({ cancellationPolicy: policy, rules });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10" noValidate>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Cancellation policy</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {CANCELLATION_POLICIES.map((option) => (
            <ChoiceCard
              key={option.value}
              name="policy"
              title={option.label}
              detail={option.hint}
              selected={policy === option.value}
              onSelect={() => setPolicy(option.value)}
            />
          ))}
        </div>
        {fieldError(fieldErrors, "cancellationPolicy") ? (
          <p className="mt-2 text-sm text-destructive">Choose a policy.</p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Guests see this before they book. The team confirms it with you during review.
          </p>
        )}
      </fieldset>

      <Field
        label="House rules"
        htmlFor="rules"
        optional
        hint="Shown to guests before they book."
        error={fieldError(fieldErrors, "rules")}
      >
        <Textarea
          id="rules"
          rows={5}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          maxLength={2000}
          placeholder={"No smoking aboard\nNo shoes on deck\nNo glass bottles"}
        />
      </Field>

      <StepFooter
        backHref={listingStepHref(draft.id, "trips")}
        pending={pending}
        label={advance ? "Save and continue" : "Save changes"}
        error={formError}
      />
    </form>
  );
}
