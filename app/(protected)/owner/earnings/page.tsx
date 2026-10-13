import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { GlassHeader, GlassPage, GlassPanel, GlassStat } from "@/shared/admin/components/glass";
import { EarningsChart } from "@/features/owner-dashboard/components/EarningsChart";
import { buildMonthly, buildOwnerAnalytics } from "@/features/owner-dashboard/owner-analytics";
import { payoutSummary } from "@/features/owner-dashboard/owner-presentation";
import { getMyBoats, getMyCharters } from "@/features/owner-dashboard/owner.data";
import type { OwnerCharter } from "@/features/owner-dashboard/owner.types";

function tripLength(c: OwnerCharter): string {
  if (!c.endsAt) return "—";
  const h = Math.round((c.endsAt.getTime() - c.startsAt.getTime()) / 36e5);
  return h >= 24 ? `${Math.round(h / 24)} days` : `${h} hr`;
}

/**
 * Earnings, Airbnb-style: the headline money, the months behind and the
 * months already booked ahead, each boat's share, and a statement of every
 * charter with what it pays and whether it's been paid.
 */
export default async function OwnerEarningsPage() {
  await requireOwner();
  const [boats, charters] = await Promise.all([getMyBoats(), getMyCharters()]);
  const now = new Date();
  const { kpis, byBoat } = buildOwnerAnalytics(charters, boats, now);
  const timeline = buildMonthly(charters, now, 11, 3);
  const year = now.getFullYear();

  // The statement: every charter that pays, newest first, grouped by month.
  const statement = charters
    .filter((c) => c.status !== "CANCELLED")
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const months = new Map<string, { label: string; total: number; rows: OwnerCharter[] }>();
  for (const c of statement) {
    const key = formatBoatLocal(c.startsAt, c.timezone, "yyyy-MM");
    const month = months.get(key) ?? {
      label: formatBoatLocal(c.startsAt, c.timezone, "MMMM yyyy"),
      total: 0,
      rows: [],
    };
    month.total += c.payoutCents ?? 0;
    month.rows.push(c);
    months.set(key, month);
  }
  const maxShare = Math.max(...byBoat.map((b) => b.sharePercent), 1);

  return (
    <GlassPage>
      <GlassHeader title="Earnings" />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <GlassStat
            size="lg"
            label={`Earned in ${year}`}
            value={formatCentsAsWholeDollars(kpis.earningsThisYearCents)}
          />
          <GlassStat
            size="lg"
            label={`Paid in ${year}`}
            value={formatCentsAsWholeDollars(kpis.paidThisYearCents)}
          />
          <GlassStat
            size="lg"
            label="Owed to you"
            value={
              <span className={kpis.pendingPayoutCents > 0 ? "text-primary-strong" : undefined}>
                {formatCentsAsWholeDollars(kpis.pendingPayoutCents)}
              </span>
            }
          />
          <GlassStat
            size="lg"
            label="Booked ahead"
            value={formatCentsAsWholeDollars(kpis.bookedAheadCents)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <EarningsChart monthly={timeline} title="By month" className="xl:col-span-8" />
          <GlassPanel title={`By boat, ${year}`} className="xl:col-span-4">
            <ul className="space-y-4">
              {byBoat.map((b) => (
                <li key={b.boatId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-foreground">{b.boatName}</span>
                    <span className="shrink-0 font-semibold text-foreground tabular-nums">
                      {b.earningsCents > 0 ? formatCentsAsWholeDollars(b.earningsCents) : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-glass-inset">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.sharePercent / maxShare) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.charters} {b.charters === 1 ? "charter" : "charters"} · {b.hours} hours on
                    the water
                  </p>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <GlassPanel title="Statement" className="p-0">
          {months.size === 0 ? (
            <p className="px-5 pb-8 text-center text-sm text-muted-foreground">
              Every charter shows here with what it pays you and whether it&apos;s been paid.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-glass-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium">Boat</th>
                    <th className="py-2.5 font-medium">Trip</th>
                    <th className="py-2.5 text-right font-medium">Your earnings</th>
                    <th className="px-5 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                {[...months.entries()].map(([key, month]) => (
                  <tbody key={key} className="divide-y divide-glass-border">
                    <tr className="bg-glass-inset">
                      <th
                        colSpan={3}
                        scope="rowgroup"
                        className="px-5 py-2 text-left text-xs font-semibold text-foreground"
                      >
                        {month.label}
                      </th>
                      <td className="py-2 text-right text-xs font-semibold text-foreground tabular-nums">
                        {formatCentsAsWholeDollars(month.total)}
                      </td>
                      <td />
                    </tr>
                    {month.rows.map((c) => {
                      const payout = payoutSummary(c);
                      const ahead = c.status === "BOOKED" && c.startsAt > now;
                      const note = ahead ? "Booked" : payout.note;
                      return (
                        <tr key={c.id}>
                          <td className="px-5 py-3 text-foreground tabular-nums">
                            {formatBoatLocal(c.startsAt, c.timezone, "EEE, MMM d")}
                          </td>
                          <td className="py-3 text-foreground">{c.boatName}</td>
                          <td className="py-3 text-muted-foreground">{tripLength(c)}</td>
                          <td className="py-3 text-right font-semibold text-foreground tabular-nums">
                            {payout.amount ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                                note === "Paid"
                                  ? "bg-success-soft text-success ring-success/25"
                                  : note === "Booked"
                                    ? "bg-info-soft text-info ring-info/25"
                                    : note === "Pending"
                                      ? "bg-glass-inset text-muted-foreground ring-glass-border"
                                      : "bg-warning-soft text-warning ring-warning/25"
                              )}
                            >
                              {note}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </GlassPanel>
      </div>
    </GlassPage>
  );
}
