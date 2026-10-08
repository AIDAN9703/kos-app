"use client";

import { Search } from "lucide-react";

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/**
 * Shared search input for admin filters: a frosted pill, so every admin
 * list reads the same.
 */
export function FilterSearch({ value, onChange, placeholder }: FilterSearchProps) {
  return (
    <div className="relative h-10 w-full max-w-md flex-1 sm:w-64 lg:w-72">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-full border border-glass-border bg-glass-inset pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:bg-glass-strong focus:ring-1 focus:ring-glass-border"
      />
    </div>
  );
}

