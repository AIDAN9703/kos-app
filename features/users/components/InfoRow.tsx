import type { ReactNode } from "react";

/** One labelled fact on the admin user detail cards. */
export function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      {children ?? <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>}
    </div>
  );
}

/** "Yes" in full ink, "No" muted. */
export function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="text-sm font-medium text-foreground">Yes</span>
  ) : (
    <span className="text-sm font-medium text-muted-foreground">No</span>
  );
}
