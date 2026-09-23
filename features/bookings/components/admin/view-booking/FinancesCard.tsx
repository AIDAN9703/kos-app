import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { Payment } from "@/database/types";
import type { BookingExpenseLine } from "@/features/bookings/booking-expense.types";
import type { CustomerMoney } from "@/features/bookings/lib/booking-money";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";
import { AdminBookingMakePaymentButton } from "./AdminBookingMakePaymentButton";
import { BookingAddExpenseButton } from "./BookingAddExpenseButton";
import { FinancesBreakdown, type FinancesLines } from "./FinancesBreakdown";

export type { FinancesLines } from "./FinancesBreakdown";

const METHOD_LABELS: Record<string, string> = {
  STRIPE_CHECKOUT: "Card",
  STRIPE_LINK: "Card",
  STRIPE_INVOICE: "Card (invoice)",
  MANUAL: "Off-card",
};

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  FULL_PAYMENT: "Full payment",
  PARTIAL: "Partial payment",
  ADDITIONAL: "Additional charge",
  REFUND: "Refund",
};

/**
 * The customer's money, top to bottom the way an admin reads it: what they
 * owe → what they've paid → the payments behind it. The breakdown becomes an
 * editor in the page's edit mode (FinancesBreakdown). Add expense lives here
 * too (it's money); what KOS makes is read in CommissionCard.
 */
export function FinancesCard({
  bookingId,
  isInquiry,
  isSettled,
  money,
  lines,
  pricingTierId,
  pricingTiers,
  payments,
  expenseLines,
  opsGmvCents,
  totalAmountCents,
  serviceFeeCents,
  currency,
  estimatedValueCents,
  budgetCents,
  stripeDashboardBase,
}: {
  bookingId: string;
  isInquiry: boolean;
  /** COMPLETED / CANCELLED — pricing is history, no editing. */
  isSettled: boolean;
  money: CustomerMoney;
  lines: FinancesLines;
  pricingTierId: string | null;
  pricingTiers: PricingTierOption[];
  payments: Payment[];
  /** For the Add expense editor (the totals show in Commission). */
  expenseLines: BookingExpenseLine[];
  opsGmvCents: number | null;
  totalAmountCents: number | null;
  serviceFeeCents: number | null;
  currency: string;
  estimatedValueCents: number | null;
  budgetCents: number | null;
  /** https://dashboard.stripe.com or …/test — decided by the live key. */
  stripeDashboardBase: string;
}) {
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Finances</CardTitle>
          {!isInquiry ? (
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
          ) : null}
        </div>
      </CardHeader>

      {isInquiry ? (
        <CardContent className="space-y-3">
          <dl className="space-y-1.5 text-sm">
            <Row label="Est. charter value" value={estimatedValueCents != null ? fmt(estimatedValueCents) : "—"} />
            <Row label="Customer budget" value={budgetCents != null ? fmt(budgetCents) : "—"} muted />
          </dl>
          <p className="text-xs text-muted-foreground">
            Price the trip with Create proposal and the full breakdown appears here.
          </p>
        </CardContent>
      ) : (
        <CardContent className="space-y-6">
          <section>
            <SectionLabel>Breakdown</SectionLabel>
            <div className="mt-2">
              <FinancesBreakdown
                bookingId={bookingId}
                editable={!isSettled}
                currency={currency}
                money={money}
                lines={lines}
                pricingTierId={pricingTierId}
                pricingTiers={pricingTiers}
              />
            </div>
          </section>

          <section>
            <SectionLabel>Payments</SectionLabel>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-border/50">
                {payments.map((p) => (
                  <PaymentRow key={p.id} payment={p} currency={currency} stripeDashboardBase={stripeDashboardBase} />
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      )}
    </Card>
  );
}

function PaymentRow({
  payment: p,
  currency,
  stripeDashboardBase,
}: {
  payment: Payment;
  currency: string;
  stripeDashboardBase: string;
}) {
  const isRefund = p.paymentType === "REFUND";
  const amount = formatCentsAsCurrency(Number(p.amountCents), { currency: p.currency ?? currency });
  const method = p.paymentMethodDetail ?? METHOD_LABELS[p.paymentMethodType] ?? p.paymentMethodType;
  const when = format(new Date(p.processedAt ?? p.createdAt), "MMM d, yyyy");
  const settled = p.status === "SUCCEEDED";
  const href = p.stripePaymentIntentId ? `${stripeDashboardBase}/payments/${p.stripePaymentIntentId}` : null;

  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {TYPE_LABELS[p.paymentType] ?? p.paymentType}
          <span className="text-muted-foreground"> · {method}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {when}
          {!settled ? ` · ${p.status.toLowerCase()}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn("text-sm font-semibold tabular-nums", isRefund && "text-destructive", !settled && "text-muted-foreground")}>
          {isRefund ? "−" : ""}
          {amount}
        </span>
        {href ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      </div>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Stripe"
          className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/40"
        >
          {body}
        </a>
      ) : (
        <div className="flex items-center justify-between gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h3>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("truncate", muted ? "text-muted-foreground" : "text-foreground")}>{label}</dt>
      <dd className={cn("shrink-0 tabular-nums", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}
