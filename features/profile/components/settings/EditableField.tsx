"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import type { ActionResult } from "../../profile.types";

export interface EditableFieldSpec {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  placeholder?: string;
  required?: boolean;
  /** Share a row with the next `half` field (city + state, for example). */
  half?: boolean;
}

interface EditableFieldProps {
  /** Row title, e.g. "Name". */
  label: string;
  /** One input, or several saved together. */
  fields: EditableFieldSpec[];
  values: Record<string, string | null | undefined>;
  /** Read-mode text; defaults to the non-empty values joined with commas. */
  displayValue?: string | null;
  description?: string;
  /** Extra read-mode content next to the value, e.g. a "Verified" chip. */
  aside?: ReactNode;
  onSave: (values: Record<string, string | null>) => Promise<ActionResult>;
}

/**
 * Read-mode row with an Edit link that flips into an inline form.
 * Saves go through a server action; field errors it returns are shown beside
 * the matching input, a general error above the buttons.
 */
export function EditableField({
  label,
  fields,
  values,
  displayValue,
  description,
  aside,
  onSave,
}: EditableFieldProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const currentDraft = () =>
    Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? ""])) as Record<string, string>;

  const begin = () => {
    setDraft(currentDraft());
    setError(null);
    setFieldErrors({});
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
    setFieldErrors({});
  };

  const dirty = fields.some((f) => (draft[f.key] ?? "") !== (values[f.key] ?? ""));

  const save = async () => {
    const missing = fields.find((f) => f.required && !draft[f.key]?.trim());
    if (missing) {
      setFieldErrors({ [missing.key]: [`${missing.label} is required`] });
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const payload = Object.fromEntries(
      fields.map((f) => [f.key, draft[f.key]?.trim() || null])
    ) as Record<string, string | null>;
    const result = await onSave(payload);
    setSaving(false);
    if (result.success) {
      setEditing(false);
      toast({ title: "Saved", description: `${label} updated.` });
    } else {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    }
  };

  const shown =
    displayValue ??
    fields
      .map((f) => values[f.key])
      .filter((v): v is string => Boolean(v))
      .join(", ");

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{label}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className={cn("text-[15px]", shown ? "text-slate-800" : "text-slate-400")}>
              {shown || "Not provided"}
            </p>
            {aside}
          </div>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={begin}
          className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  // Pair consecutive `half` fields on one row.
  const rows: EditableFieldSpec[][] = [];
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    const next = fields[i + 1];
    if (field.half && next?.half) {
      rows.push([field, next]);
      i += 1;
    } else {
      rows.push([field]);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="border-b border-gray-200 py-4"
    >
      <p className="text-sm font-medium text-primary">{label}</p>
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.map((f) => f.key).join("+")} className={cn(row.length > 1 && "grid gap-3 sm:grid-cols-2")}>
            {row.map((field) => {
              const id = `field-${field.key}`;
              const fieldError = fieldErrors[field.key]?.[0];
              const shared = {
                id,
                value: draft[field.key] ?? "",
                placeholder: field.placeholder,
                disabled: saving,
                "aria-invalid": fieldError ? true : undefined,
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setDraft((d) => ({ ...d, [field.key]: e.target.value })),
                className: cn("h-11 rounded-xl", fieldError && "border-destructive"),
              };
              return (
                <div key={field.key}>
                  <Label htmlFor={id} className="text-xs font-medium text-slate-600">
                    {field.label}
                    {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                  </Label>
                  <div className="mt-1">
                    {field.type === "textarea" ? (
                      <Textarea {...shared} className={cn("min-h-[110px] rounded-xl", fieldError && "border-destructive")} />
                    ) : (
                      <Input {...shared} type={field.type ?? "text"} />
                    )}
                  </div>
                  {fieldError ? <p className="mt-1 text-xs text-destructive">{fieldError}</p> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {description ? <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving || !dirty}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
