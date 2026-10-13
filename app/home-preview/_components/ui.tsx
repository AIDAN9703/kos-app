import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils/general-utils";

/** The page shell every section lines up to. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-8", className)}>{children}</div>
  );
}

/** Tracked small-caps label above a section heading. */
export function Dateline({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SectionTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2
      className={cn(
        "mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-primary sm:text-4xl",
        className
      )}
    >
      {children}
    </h2>
  );
}

/** Underlined text link, the quiet alternative to a button. */
export const textLinkClass =
  "text-sm font-semibold text-primary underline decoration-gold/60 underline-offset-[6px] transition-colors hover:decoration-gold";

export const pillPrimaryClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary/90";

export const pillSecondaryClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-foreground/10 px-6 text-[15px] font-semibold text-primary transition-colors hover:bg-foreground/15";
