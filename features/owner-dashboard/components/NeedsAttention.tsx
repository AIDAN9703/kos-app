import Link from "next/link";
import { cn } from "@/shared/lib/utils/general-utils";
import { GlassPanel } from "@/shared/admin/components/glass";
import type { AttentionItem } from "../owner-insights";

const DOT: Record<AttentionItem["tone"], string> = {
  warning: "bg-warning shadow-[0_0_10px_var(--warning)]",
  action: "bg-primary shadow-[0_0_10px_var(--primary)]",
  info: "bg-info",
};

/** What the owner can do something about: listings to finish, photos, insurance. */
export function NeedsAttention({
  items,
  className,
}: {
  items: AttentionItem[];
  className?: string;
}) {
  return (
    <GlassPanel
      title="Needs your attention"
      className={className}
      aside={
        items.length > 0 ? (
          <span className="rounded-full bg-glass-strong px-2 py-0.5 text-[11px] font-semibold text-foreground/80 tabular-nums ring-1 ring-glass-border ring-inset">
            {items.length}
          </span>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="text-base font-semibold text-foreground">You&apos;re all set</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Nothing needs you right now. We&apos;ll flag anything that does, like a listing to
            finish or insurance about to expire.
          </p>
        </div>
      ) : (
        <ul className="-mx-5 -mb-5 divide-y divide-glass-border border-t border-glass-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-4">
              <span
                aria-hidden
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[item.tone])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <Link
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-[filter] hover:brightness-110",
                  item.tone === "info"
                    ? "bg-glass-strong text-foreground ring-1 ring-glass-border ring-inset"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {item.cta}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
