"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Smartphone } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/lib/hooks/use-toast";
import type { ActionResponse } from "@/shared/lib/types/types";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { cn, formatDate } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  recordOwnerZellePayoutAction,
  removeOwnerZellePayoutAction,
} from "../../owner-accounts.actions";
import { autoPayoutDate, PAYOUT_METHOD_LABELS, zelleLabel } from "../../owner-accounts.constants";
import type { OwnerPayouts, OwnerPayoutSetup, PayoutLine } from "../../owner-accounts.types";

const money = (cents: number, currency = "USD") => formatCentsAsCurrency(cents, { currency });
const left = (l: PayoutLine) => l.owedCents - l.paidCents - l.pendingCents;
const tripDate = (l: { startsAt: Date; timezone: string | null }) =>
  formatBoatLocal(l.startsAt, l.timezone, "EEE, MMM d, yyyy");

const STATUS = {
  PAID: "bg-success-soft text-success ring-success/25",
  PENDING: "bg-info-soft text-info ring-info/25",
  FAILED: "bg-destructive-soft text-destructive ring-destructive/25",
} as const;
const HISTORY_SHOWN = 8;
const chip =
  "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap";

/**
 * Paying an owner: charters whose trip is over and that still owe them,
 * then every payout so far. Direct deposit owners are paid by the daily
 * run (each row says when); for everyone else the team sends Zelle and
 * records it here. Amounts come from the charter's Owner payout lines.
 */
export function OwnerPayoutsPanel({
  accountId,
  ownerName,
  isHouse,
  setup,
  payouts,
}: {
  accountId: string;
  ownerName: string;
  isHouse: boolean;
  setup: OwnerPayoutSetup;
  payouts: OwnerPayouts;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [zelleFor, setZelleFor] = useState<PayoutLine | null>(null);
  const [zelle, setZelle] = useState({ amount: "", paidOn: "", reference: "", notify: true });
  const [zelleErrors, setZelleErrors] = useState<Record<string, string[] | undefined>>({});
  const [showAll, setShowAll] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const history = showAll ? payouts.history : payouts.history.slice(0, HISTORY_SHOWN);
  const upcomingCents = payouts.upcoming.reduce((n, l) => n + left(l), 0);
  const paidAutomatically = !isHouse && setup.payoutMethod === "STRIPE" && setup.stripeReady;
  const note = isHouse
    ? "These boats' owners aren't set up yet. Record what you pay them here so it's tracked."
    : paidAutomatically
      ? "Paid automatically by direct deposit the day after each trip."
      : setup.stripeReady
        ? `${ownerName} chose Zelle: send it from the bank app, then record it here.`
        : `Once ${ownerName} sets up direct deposit in their owner portal, they're paid automatically. Until then, send Zelle and record it here.`;

  function run<T>(work: () => Promise<ActionResponse<T>>, done?: () => void) {
    startTransition(async () => {
      const result = await work();
      if (!result.success) {
        if (result.fieldErrors) setZelleErrors(result.fieldErrors);
        toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        if (!result.fieldErrors) done?.();
        router.refresh();
        return;
      }
      toast({ title: result.message ?? "Done" });
      done?.();
      router.refresh();
    });
  }

  function openZelle(line: PayoutLine) {
    setZelle({
      amount: (left(line) / 100).toFixed(2),
      paidOn: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notify: !isHouse,
    });
    setZelleErrors({});
    setZelleFor(line);
  }

  return (
    <GlassPanel
      title="Payouts"
      aside={
        isHouse ? null : (
          <span className="text-xs text-muted-foreground">
            {setup.payoutMethod
              ? setup.payoutMethod === "ZELLE"
                ? "Paid by Zelle"
                : "Paid by direct deposit"
              : "No payout method yet"}
          </span>
        )
      }
    >
      {payouts.due.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to pay right now.</p>
      ) : (
        <ul className="-mx-5 divide-y divide-glass-border border-y border-glass-border">
          {payouts.due.map((line) => {
            const auto = paidAutomatically && line.currency.toUpperCase() === "USD";
            return (
              <li key={line.bookingId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{line.boatName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tripDate(line)} · owed {money(line.owedCents, line.currency)}
                    {line.paidCents > 0 ? `, paid ${money(line.paidCents, line.currency)}` : ""}
                    {line.pendingCents > 0
                      ? `, ${money(line.pendingCents, line.currency)} on its way`
                      : ""}
                  </p>
                </div>
                {auto ? (
                  <p className="text-xs whitespace-nowrap text-muted-foreground">
                    {line.pendingCents > 0
                      ? "Sending now"
                      : `Direct deposit ${formatBoatLocal(
                          autoPayoutDate(line.endsAt ?? line.startsAt),
                          line.timezone,
                          "EEE, MMM d"
                        )}`}
                  </p>
                ) : (
                  <Button
                    variant="glass"
                    className="h-9 gap-1.5 border-0 px-4"
                    disabled={pending}
                    onClick={() => openZelle(line)}
                  >
                    <Smartphone className="size-4" />
                    Record Zelle
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {payouts.upcoming.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {payouts.upcoming.length} {payouts.upcoming.length === 1 ? "charter" : "charters"} ahead
          {upcomingCents > 0 ? `, ${money(upcomingCents)} to pay once the trips are over` : ""}.
        </p>
      ) : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}

      {payouts.history.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">History</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody className="divide-y divide-glass-border">
                {history.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDate(p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="block truncate text-foreground">{p.boatName}</span>
                      {p.failureReason ? (
                        <span className="block text-xs text-destructive">{p.failureReason}</span>
                      ) : p.reference ? (
                        <span className="block text-xs text-muted-foreground">{p.reference}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-foreground tabular-nums">
                      {money(p.amountCents, p.currency)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {PAYOUT_METHOD_LABELS[p.method]}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn(chip, STATUS[p.status])}>
                        {p.status === "PAID"
                          ? "Paid"
                          : p.status === "PENDING"
                            ? "Sending"
                            : "Failed"}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {p.method === "ZELLE" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            removing === p.id
                              ? run(() => removeOwnerZellePayoutAction(accountId, p.id))
                              : setRemoving(p.id)
                          }
                          onBlur={() => setRemoving((r) => (r === p.id ? null : r))}
                          className={cn(
                            "text-xs font-semibold disabled:opacity-50",
                            removing === p.id
                              ? "text-destructive"
                              : "text-muted-foreground hover:text-destructive"
                          )}
                        >
                          {removing === p.id ? "Remove it?" : "Remove"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payouts.history.length > HISTORY_SHOWN ? (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="justify-self-start text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {showAll ? "Show fewer" : `Show all ${payouts.history.length}`}
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={zelleFor !== null} onOpenChange={(o) => !o && setZelleFor(null)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!zelleFor) return;
              run(
                () =>
                  recordOwnerZellePayoutAction(accountId, {
                    bookingId: zelleFor.bookingId,
                    amountDollars: zelle.amount,
                    paidOn: zelle.paidOn,
                    reference: zelle.reference,
                    notifyOwner: zelle.notify,
                  }),
                () => setZelleFor(null)
              );
            }}
          >
            <DialogHeader>
              <DialogTitle>Record a Zelle payment</DialogTitle>
              <DialogDescription>
                {zelleFor ? `${zelleFor.boatName}, ${tripDate(zelleFor)}.` : null}{" "}
                {setup.zelleContact
                  ? `Their Zelle: ${zelleLabel(setup.zelleContact)}.`
                  : "No Zelle on file for them."}{" "}
                Send it in your bank&apos;s app first, then record it here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">Amount ($)</span>
                <Input
                  id="zelle-amount"
                  inputMode="decimal"
                  value={zelle.amount}
                  onChange={(e) => setZelle({ ...zelle, amount: e.target.value })}
                />
                {zelleErrors.amountDollars ? (
                  <span className="text-xs text-destructive">{zelleErrors.amountDollars[0]}</span>
                ) : null}
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">Sent on</span>
                <Input
                  id="zelle-date"
                  type="date"
                  value={zelle.paidOn}
                  onChange={(e) => setZelle({ ...zelle, paidOn: e.target.value })}
                />
                {zelleErrors.paidOn ? (
                  <span className="text-xs text-destructive">{zelleErrors.paidOn[0]}</span>
                ) : null}
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Confirmation number (optional)</span>
                <Input
                  id="zelle-reference"
                  value={zelle.reference}
                  onChange={(e) => setZelle({ ...zelle, reference: e.target.value })}
                  maxLength={120}
                />
              </label>
              {isHouse ? null : (
                <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
                  <Checkbox
                    id="zelle-notify"
                    checked={zelle.notify}
                    onCheckedChange={(c) => setZelle({ ...zelle, notify: c === true })}
                  />
                  Email {ownerName} that it&apos;s on its way (untick for payments made long ago)
                </label>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="glass"
                className="border-0"
                onClick={() => setZelleFor(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </GlassPanel>
  );
}
