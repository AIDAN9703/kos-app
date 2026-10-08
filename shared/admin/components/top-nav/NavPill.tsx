import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * One page in the top bar: its icon in a circle that widens to show the
 * page's name on hover or keyboard focus. The current page stays open, in
 * gold. The name is clipped, not hidden, so it's always the link's
 * accessible name.
 *
 * The width animates as a grid column from 0fr to 1fr, which follows the
 * label's real width both ways (max-width snaps: it runs to its cap, not to
 * the text). Opening waits a beat, so sweeping across the bar doesn't open
 * every pill on the way; closing is immediate.
 */
export function NavPill({
  href,
  label,
  icon: Icon,
  active,
  featured = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** The spotlight treatment (the Assistant): violet, with a slow sweep. */
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/pill relative flex h-11 shrink-0 items-center overflow-hidden rounded-full border px-3 outline-none transition-[filter,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]"
          : featured
            ? "kos-featured-nav border-violet-400/40 bg-linear-to-r from-violet-500/20 to-cyan-400/15 text-violet-100 hover:shadow-[0_0_24px_-8px_rgb(167_139_250)]"
            : "border-glass-border bg-glass-strong text-foreground/85 hover:text-foreground hover:brightness-125"
      )}
    >
      <Icon aria-hidden className={cn("size-[18px] shrink-0", featured && !active && "kos-featured-icon text-fuchsia-300")} />
      <span
        className={cn(
          "grid transition-[grid-template-columns,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          active
            ? "ml-2 grid-cols-[1fr]"
            : "ml-0 grid-cols-[0fr] group-hover/pill:ml-2 group-hover/pill:grid-cols-[1fr] group-hover/pill:delay-100 group-focus-visible/pill:ml-2 group-focus-visible/pill:grid-cols-[1fr]"
        )}
      >
        <span
          className={cn(
            "min-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-opacity duration-200 motion-reduce:transition-none",
            active
              ? "opacity-100"
              : "opacity-0 group-hover/pill:opacity-100 group-hover/pill:delay-150 group-focus-visible/pill:opacity-100"
          )}
        >
          {label}
        </span>
      </span>
    </Link>
  );
}
