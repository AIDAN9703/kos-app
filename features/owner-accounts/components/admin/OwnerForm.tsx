"use client";

import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { OWNER_KIND_LABELS } from "../../owner-accounts.constants";
import type { OwnerAccountKind } from "../../owner-accounts.types";

export interface OwnerFormValues {
  name: string;
  kind: OwnerAccountKind;
  contactEmail: string;
  contactPhone: string;
  zelleContact: string;
  adminNotes: string;
}

export const EMPTY_OWNER: OwnerFormValues = {
  name: "",
  kind: "INDIVIDUAL",
  contactEmail: "",
  contactPhone: "",
  zelleContact: "",
  adminNotes: "",
};

/** The form values as the server expects them. */
export function ownerInput(v: OwnerFormValues) {
  return v;
}

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Field({
  label,
  htmlFor,
  error,
  children,
  wide,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}>
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Who the owner is, how to reach them, and how KOS pays them. */
export function OwnerForm({
  values,
  onChange,
  errors = {},
}: {
  values: OwnerFormValues;
  onChange: (next: OwnerFormValues) => void;
  errors?: Record<string, string[] | undefined>;
}) {
  const set =
    <K extends keyof OwnerFormValues>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...values, [key]: e.target.value as OwnerFormValues[K] });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="owner-name" error={errors.name?.[0]} wide>
        <Input
          id="owner-name"
          value={values.name}
          onChange={set("name")}
          placeholder="Jane Smith, or Blue Water Charters LLC"
          maxLength={120}
        />
      </Field>
      <Field label="Type" htmlFor="owner-kind">
        <select id="owner-kind" value={values.kind} onChange={set("kind")} className={selectClass}>
          {Object.entries(OWNER_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="hidden sm:block" />
      <Field label="Contact email" htmlFor="owner-email" error={errors.contactEmail?.[0]}>
        <Input
          id="owner-email"
          type="email"
          value={values.contactEmail}
          onChange={set("contactEmail")}
          placeholder="Where invites go"
        />
      </Field>
      <Field label="Contact phone" htmlFor="owner-phone" error={errors.contactPhone?.[0]}>
        <Input id="owner-phone" value={values.contactPhone} onChange={set("contactPhone")} />
      </Field>
      <Field
        label="Zelle (if they're paid by Zelle)"
        htmlFor="owner-zelle"
        error={errors.zelleContact?.[0]}
        wide
      >
        <Input
          id="owner-zelle"
          value={values.zelleContact}
          onChange={set("zelleContact")}
          placeholder="The email or phone their Zelle uses"
          maxLength={200}
        />
      </Field>
      <Field label="Notes (KOS only)" htmlFor="owner-notes" wide>
        <Textarea
          id="owner-notes"
          value={values.adminNotes}
          onChange={set("adminNotes")}
          className="min-h-20 resize-y"
          maxLength={2000}
        />
      </Field>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Direct deposit is set up by the owner in their portal, on Stripe&apos;s site.
      </p>
    </div>
  );
}
