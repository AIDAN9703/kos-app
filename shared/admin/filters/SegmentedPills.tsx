"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * Frosted pill groups: pick one of a few (who to show, which dates, which
 * view). The active pill is neutral, not gold: gold is the page's main
 * button. `sm` sits in panel headers.
 */

type Size = "sm" | "md";

function trackClass(size: Size, className?: string) {
  return cn("glass-chip inline-flex shrink-0 items-center rounded-full p-1", size === "sm" ? "h-9" : "h-10", className);
}

function pillClass(active: boolean, size: Size) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors",
    size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3 text-sm",
    active
      ? "bg-glass-strong text-foreground shadow-sm ring-1 ring-inset ring-glass-border"
      : "text-muted-foreground hover:text-foreground"
  );
}

export interface SegmentedOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

/** Buttons that set a value (usually a URL filter). */
export function SegmentedPills<T extends string | null>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  /** What the group chooses, for screen readers ("Show", "Dates"). */
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: Size;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={trackClass(size, className)}>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon, count }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionLabel}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(optionValue)}
            className={pillClass(active, size)}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {optionLabel}
            {count != null ? <span className="tabular-nums opacity-60">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** The same pills as links between pages (Campaigns | Contacts). */
export function SegmentedNav({
  label,
  links,
  activeHref,
  size = "md",
  className,
}: {
  label: string;
  links: { href: string; label: string }[];
  activeHref: string;
  size?: Size;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={trackClass(size, className)}>
      {links.map((link) => {
        const active = link.href === activeHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(pillClass(active, size), "px-4")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
