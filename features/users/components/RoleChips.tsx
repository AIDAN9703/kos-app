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

/** Each role has its own color so a list of people reads at a glance. */
const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-primary/15 text-primary-strong ring-primary/30",
  broker: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
  owner: "bg-pink-400/15 text-pink-300 ring-pink-400/30",
  captain: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30",
  crew: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  customer: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
};

const chip = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

/** A person's roles as small chips, with "Deactivated" first when it applies. */
export function RoleChips({ roles, deactivated = false }: { roles: Role[]; deactivated?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {deactivated ? <span className={cn(chip, "bg-destructive/15 text-destructive ring-destructive/30")}>Deactivated</span> : null}
      {roles.map((role) => (
        <span key={role} className={cn(chip, ROLE_COLORS[role])}>
          {ROLE_LABELS[role]}
        </span>
      ))}
    </div>
  );
}
