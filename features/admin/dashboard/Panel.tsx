import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils/general-utils";

/** The dashboard's one frame: a frosted panel with a title, optional count and controls. */
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
    <section className={cn("glass-panel flex min-w-0 flex-col overflow-hidden", className)}>
      <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-glass-border px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {count != null && (
          <span className="rounded-full bg-glass-strong px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground/80 ring-1 ring-inset ring-glass-border">
            {count}
          </span>
        )}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
