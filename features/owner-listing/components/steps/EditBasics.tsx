"use client";

import type { ListingDraft } from "../../listing.types";
import type { CatalogMake } from "@/features/boat-catalog/boat-catalog.types";
import { OTHER_CHOICE } from "@/features/boat-catalog/boat-catalog.keys";
import { useStepSave } from "../useStepSave";
import { basicsValuesFrom } from "../../basics-values";
import { BasicsForm } from "./BasicsForm";

export function EditBasics({
  draft,
  advance,
  catalog,
}: {
  draft: ListingDraft;
  advance: boolean;
  catalog: CatalogMake[];
}) {
  const { save, pending, fieldErrors, formError } = useStepSave(draft.id, "basics", advance);
  return (
    <BasicsForm
      catalog={catalog}
      // A saved listing with no make or model had "Other" picked.
      initial={basicsValuesFrom({
        ...draft,
        make: draft.make ?? OTHER_CHOICE,
        model: draft.model ?? OTHER_CHOICE,
      })}
      onSubmit={save}
      pending={pending}
      fieldErrors={fieldErrors}
      formError={formError}
      submitLabel={advance ? "Save and continue" : "Save changes"}
    />
  );
}
