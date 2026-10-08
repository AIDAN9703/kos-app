"use client";

import Link from "next/link";
import { ArrowUpRight, Bell, Check } from "lucide-react";
import { useNotifications } from "@/features/admin/hooks/useNotifications";
import { circleClass } from "@/shared/admin/components/top-nav/controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils/general-utils";
import { KIND_LABELS, Led, when } from "./action-item";

/**
 * The bell in the top bar: the dashboard's "Needs action" queue. The badge
 * counts it (red when anything is urgent); opening it refreshes the list.
 */
export function NotificationsBell() {
  const { data, isPending, isError, refetch } = useNotifications();

  return (
    <Popover onOpenChange={(open) => open && void refetch()}>
      <PopoverTrigger asChild>
        <button type="button" className={circleClass} aria-label="Notifications" title="Notifications">
          <Bell />
          {data && data.total > 0 && (
            <span
              className={cn(
                "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-background",
                data.urgent > 0 ? "bg-destructive text-white" : "bg-primary text-primary-foreground"
              )}
            >
              {data.total > 9 ? "9+" : data.total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Needs action</p>
          {data && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {data.total}
            </span>
          )}
          {data && data.urgent > 0 && (
            <span className="ml-auto rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
              {data.urgent} urgent
            </span>
          )}
        </div>

        {isPending ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : isError || !data ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Couldn&apos;t load this. Try again in a moment.</p>
        ) : data.items.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Check className="size-4 text-success" />
            Nothing waiting.
          </p>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto p-1.5">
            {data.items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted"
                >
                  <Led severity={item.severity} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">{item.subject}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {KIND_LABELS[item.kind]} · {item.detail}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                    {when(item)}
                    {item.external && <ArrowUpRight className="size-3" />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/admin"
          className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary-strong transition-colors hover:bg-muted"
        >
          Open the dashboard
        </Link>
      </PopoverContent>
    </Popover>
  );
}
