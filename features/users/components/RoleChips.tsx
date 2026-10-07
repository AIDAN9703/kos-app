import type { Role } from "@/shared/lib/auth/permissions";
import { cn } from "@/shared/lib/utils/general-utils";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  broker: "Broker",
  owner: "Owner",
  captain: "Captain",
  crew: "Crew",
  customer: "Customer",
};

const chip = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

/** A person's roles as small chips, with "Deactivated" first when it applies. */
export function RoleChips({ roles, deactivated = false }: { roles: Role[]; deactivated?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {deactivated ? <span className={cn(chip, "bg-destructive-soft text-destructive")}>Deactivated</span> : null}
      {roles.map((role) => (
        <span
          key={role}
          className={cn(chip, "bg-muted ring-1 ring-inset ring-border", role === "customer" ? "text-muted-foreground" : "text-foreground")}
        >
          {ROLE_LABELS[role]}
        </span>
      ))}
    </div>
  );
}
