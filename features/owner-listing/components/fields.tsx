"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";

/** Label, optional hint, the control, and its error: every field in the flow. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-800">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-slate-400">Optional</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-sm leading-6 text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** A big tappable radio option: title, a line of detail, a check when picked. */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  detail,
  name,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail?: string;
  name: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col rounded-xl border bg-white px-4 py-3.5 transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"
      )}
    >
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only" />
      <span className="pr-7 text-[15px] font-semibold text-primary">{title}</span>
      {detail ? (
        <span className="mt-0.5 pr-7 text-sm leading-6 text-slate-500">{detail}</span>
      ) : null}
      {selected ? (
        <span className="absolute top-3.5 right-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
    </label>
  );
}

/** "42 / 60" under text inputs with a limit. */
export function Counter({ value, max, min }: { value: string; max: number; min?: number }) {
  const short = min !== undefined && value.trim().length < min;
  return (
    <span className={cn("text-xs tabular-nums", short ? "text-slate-400" : "text-slate-500")}>
      {value.trim().length}
      {min !== undefined && short ? ` of ${min} minimum` : ` / ${max}`}
    </span>
  );
}

/** Error for a field from a server action's fieldErrors. */
export function fieldError(errors: Record<string, string[]> | undefined, key: string) {
  return errors?.[key]?.[0];
}
