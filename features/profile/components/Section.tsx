import type { ReactNode } from "react";

interface SectionProps {
  /** Heading id, also the anchor target (e.g. /profile/bookings#past). */
  id: string;
  title: string;
  description?: string;
  /** Right-aligned header action, e.g. a "View all" link. */
  action?: ReactNode;
  children: ReactNode;
}

/** One titled block of a profile page. Every section heading looks the same. */
export function Section({ id, title, description, action, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={id} className="scroll-mt-28 text-xl font-semibold tracking-tight text-primary">
            {title}
          </h2>
          {action}
        </div>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
