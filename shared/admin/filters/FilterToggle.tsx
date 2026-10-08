"use client";

import { cn } from "@/shared/lib/utils/general-utils";

/** A frosted on/off pill for a filter that's either applied or not (Archived). */
export function FilterToggle({
  label,
  pressed,
  onPressedChange,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "glass-chip inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-[color,filter]",
        pressed ? "text-foreground ring-1 ring-inset ring-foreground/25 brightness-125" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
