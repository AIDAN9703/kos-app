import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils/general-utils";

/** The dashboard's one frame: a titled box, with optional count and controls. */
export function Panel({
  title,
  count,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <header className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
        {count != null && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Segmented control used in panel headers. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
            o.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {o.count != null && <span className="tabular-nums opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
