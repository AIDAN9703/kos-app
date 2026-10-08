"use client";

import { X } from "lucide-react";

export interface FilterChipItem {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Removable chips summarising the active filters, with a trailing "Clear all".
 * Renders nothing when there are no active filters.
 */
export function FilterChips({
  chips,
  onClearAll,
}: {
  chips: FilterChipItem[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="group inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-inset px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-glass-strong"
        >
          {chip.label}
          <X className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
