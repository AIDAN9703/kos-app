"use client";

import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils/general-utils";

interface FilterPopoverProps {
  /** Number of active filters — shown as a badge and drives the "Clear all" disabled state. */
  activeCount: number;
  onClearAll: () => void;
  /** Grid of <FilterField> controls. */
  children: ReactNode;
  triggerLabel?: string;
  /** Override the popover content width/grid if a page needs it. */
  contentClassName?: string;
}

/**
 * Shared "Filters" trigger + themed popover for admin list pages.
 * Houses a responsive grid of <FilterField> controls with a Clear all / Done footer.
 */
export function FilterPopover({
  activeCount,
  onClearAll,
  children,
  triggerLabel = "Filters",
  contentClassName,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 rounded-full border-0 bg-muted px-4 text-foreground hover:bg-muted/70 hover:text-foreground"
        >
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{triggerLabel}</span>
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[min(95vw,560px)] bg-popover p-0 text-popover-foreground"
      >
        <div
          className={cn(
            "grid grid-cols-1 gap-4 p-4 sm:grid-cols-2",
            contentClassName
          )}
        >
          {children}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="h-8 text-xs"
          >
            Clear all
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} className="h-8">
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
