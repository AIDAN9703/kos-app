import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { BookingAddOn } from "@/features/bookings/booking.types";
import type { BookingExpenseLine } from "@/features/bookings/booking-expense.types";
import type { CustomerMoney } from "@/features/bookings/lib/booking-money";
import { AdminBookingMakePaymentButton } from "./AdminBookingMakePaymentButton";
import { BookingAddExpenseButton } from "./BookingAddExpenseButton";
import { SendToCustomer, type SendToCustomerData } from "./SendToCustomer";

/** The customer's exact line items, as their link shows them. */
export interface BreakdownLines {
  boatName: string | null;
  basePriceCents: number;
  captainFeeCents: number;
  cleaningFeeCents: number;
  addOns: BookingAddOn[];
}

/**
 * What the customer's link shows, read-only, top to bottom: the charter, the
 * extras, fees, the total, then what's paid and what's left — and under it,
 * the controls to send them that link. Prices are changed from Edit trip on
 * the left; completed payments are listed in Activity. Add expense and Record
 * payment sit in the header because they are money actions, not trip edits.
 */
export function BreakdownCard({
  bookingId,
  isInquiry,
  money,
  lines,
  expenseLines,
  opsGmvCents,
  totalAmountCents,
  serviceFeeCents,
  currency,
  estimatedValueCents,
  budgetCents,
  send,
}: {
  bookingId: string;
  isInquiry: boolean;
  money: CustomerMoney;
  lines: BreakdownLines;
  /** For the Add expense editor (the totals show in Commission). */
  expenseLines: BookingExpenseLine[];
  opsGmvCents: number | null;
  totalAmountCents: number | null;
  serviceFeeCents: number | null;
  currency: string;
  estimatedValueCents: number | null;
  budgetCents: number | null;
  /** Null when there's no link to send (none yet, or the deal is settled). */
  send: SendToCustomerData | null;
}) {
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });

  if (isInquiry) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="space-y-1.5 text-sm">
            <Row
              label="Est. charter value"
              value={estimatedValueCents != null ? fmt(estimatedValueCents) : "—"}
            />
            <Row
              label="Customer budget"
              value={budgetCents != null ? fmt(budgetCents) : "—"}
              muted
            />
          </dl>
          <p className="text-xs text-muted-foreground">
            Price the trip with Create proposal and the full breakdown appears here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const feeLabel = money.serviceFeeWaived
    ? "Card fee · waived"
    : money.subtotalCents > 0 && money.serviceFeeCents > 0
      ? `Card fee (${((money.serviceFeeCents / money.subtotalCents) * 100).toFixed(2).replace(/\.?0+$/, "")}%)`
      : "Card fee";

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Breakdown</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <BookingAddExpenseButton
              bookingId={bookingId}
              totalAmountCents={totalAmountCents}
              serviceFeeCents={serviceFeeCents}
              opsGmvCents={opsGmvCents}
              currency={currency}
              initialLines={expenseLines}
            />
            <AdminBookingMakePaymentButton bookingId={bookingId} money={money} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 text-sm">
        <Group label="Charter">
          <Row label={lines.boatName ?? "Boat"} value={fmt(lines.basePriceCents)} />
          {lines.captainFeeCents > 0 ? (
            <Row label="Captain" value={fmt(lines.captainFeeCents)} />
          ) : null}
          {lines.cleaningFeeCents > 0 ? (
            <Row label="Cleaning" value={fmt(lines.cleaningFeeCents)} />
          ) : null}
        </Group>

        {lines.addOns.length > 0 ? (
          <Group label="Add-ons">
            {lines.addOns.map((a, i) => (
              <Row
                key={i}
                label={`${a.name}${a.quantity > 1 ? ` × ${a.quantity}` : ""}`}
                value={fmt(Math.round(a.total * 100))}
              />
            ))}
          </Group>
        ) : null}

        <Group>
          <Row label="Subtotal" value={fmt(money.subtotalCents)} muted />
          <Row
            label={feeLabel}
            value={fmt(money.serviceFeeCents)}
            muted
            strike={money.serviceFeeWaived}
          />
          <Row label="Total" value={fmt(money.totalCents)} strong />
        </Group>

        <Group>
          <Row
            label="Paid"
            value={fmt(money.paidCents)}
            tone={money.paidCents > 0 ? "success" : undefined}
          />
          <Row
            label={money.balanceCents > 0 ? "Balance due" : "Balance"}
            value={money.balanceCents > 0 ? fmt(money.balanceCents) : "Settled"}
            tone={money.balanceCents > 0 ? "warning" : "success"}
            strong
          />
        </Group>

        <p className="text-xs text-muted-foreground">
          {money.depositChargeCents
            ? `Deposit option: the guest may pay ${fmt(money.depositChargeCents)} first (${fmt(money.depositCents ?? 0)} deposit + ${fmt(money.depositFeeCents ?? 0)} card fee). The card fee is charged on every card payment.`
            : "No deposit: the guest pays in full. The card fee is charged on every card payment."}
        </p>

        {send ? <SendToCustomer data={send} /> : null}
      </CardContent>
    </Card>
  );
}

/** A labelled block of rows, separated from the next by a hairline. */
function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/50 pt-4 first:border-t-0 first:pt-0">
      {label ? (
        <h3 className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </h3>
      ) : null}
      <dl className="space-y-1.5">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
  strike,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  strike?: boolean;
  tone?: "success" | "warning";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={cn(
          "truncate",
          muted ? "text-muted-foreground" : "text-foreground",
          strong && "font-semibold"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          muted && !tone && "text-muted-foreground",
          strong && "font-semibold",
          strike && "line-through opacity-60",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
