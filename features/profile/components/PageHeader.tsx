import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned action, e.g. a button. */
  action?: ReactNode;
}

/** Consistent page opener for every profile page. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 text-[15px] leading-7 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
