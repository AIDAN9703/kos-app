"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import {
  ASSIGNABLE_ROLES,
  ASSIGNABLE_ROLE_LABELS,
  type AssignableRole,
} from "@/features/users/user-roles.constants";

/** The admin / broker / owner checklist (Add user sheet, Access row). */
export function RoleToggles({
  value,
  onChange,
  disabled,
}: {
  value: AssignableRole[];
  onChange: (next: AssignableRole[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {ASSIGNABLE_ROLES.map((role) => {
        const on = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((r) => r !== role) : [...value, role])}
            disabled={disabled}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
              on ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border"
              )}
            >
              {on ? <Check className="size-3" /> : null}
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">{ASSIGNABLE_ROLE_LABELS[role].label}</span>
              <span className="block text-xs text-muted-foreground">{ASSIGNABLE_ROLE_LABELS[role].description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
