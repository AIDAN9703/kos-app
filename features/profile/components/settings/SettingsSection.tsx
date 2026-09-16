import type { ReactNode } from "react";

interface SettingsSectionProps {
  /** Anchor target, so links like /profile/settings#personal land here. */
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/** One group of account rows: heading on the left, rows on the right (stacked on phones). */
export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 grid gap-4 border-t border-gray-200 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10"
    >
      <div>
        <h2 id={`${id}-heading`} className="text-lg font-bold text-primary">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
