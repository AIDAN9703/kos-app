import type { AdminUserProfile } from "@/features/users/user.types";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";
import { formatDate } from "@/shared/lib/utils/general-utils";

/** Their booked and completed trips, plus the next one ahead and the last one behind. */
function tripSummary(user: AdminUserProfile, now = Date.now()) {
  const real = user.trips.filter((t) => t.status === "BOOKED" || t.status === "COMPLETED");
  const dated = real.filter((t) => t.startDateTime).map((t) => ({ ...t, at: new Date(t.startDateTime!).getTime() }));
  return {
    real,
    next: dated.filter((t) => t.at > now).sort((a, b) => a.at - b.at)[0],
    last: dated.filter((t) => t.at <= now).sort((a, b) => b.at - a.at)[0],
  };
}

/** Four numbers across the top: trips, booked value, next and last trip (or their work, for staff and owners). */
export function UserStats({ user }: { user: AdminUserProfile }) {
  const { real, next, last } = tripSummary(user);
  const isStaff = user.roles.includes("admin") || user.roles.includes("broker");
  const isOwner = user.roles.includes("owner") || user.boats.length > 0;

  const cells = [
    { label: "Trips", value: real.length.toLocaleString() },
    { label: "Booked value", value: formatCentsCompact(real.reduce((n, t) => n + (t.totalAmountCents ?? 0), 0)) },
    { label: "Next trip", value: next ? formatDate(new Date(next.at)) : "None" },
    isStaff
      ? { label: "Deals assigned", value: user.assignedDeals.length.toLocaleString() }
      : isOwner
        ? { label: "Boats", value: user.boats.length.toLocaleString() }
        : { label: "Last trip", value: last ? formatDate(new Date(last.at)) : "None" },
  ];

  return (
    <div className="glass-panel grid grid-cols-2 overflow-hidden md:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="border-glass-border px-5 py-4 even:border-l [&:nth-child(n+3)]:border-t md:border-l md:first:border-l-0 md:[&:nth-child(n+3)]:border-t-0"
        >
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
