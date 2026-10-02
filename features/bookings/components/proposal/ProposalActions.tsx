"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CreditCard, FileEdit, Info, Loader2, Send } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  requestProposalChangesAction,
  startProposalPayment,
} from "@/features/bookings/actions/proposal.actions";
import type { ProposalPaymentOptions } from "@/features/bookings/lib/proposal.types";

interface ProposalActionsProps {
  publicToken: string;
  payment: ProposalPaymentOptions;
  totalPaidCents: number;
  totalAmountCents: number;
}

/**
 * The proposal's payment rail. Paying IS the yes — there is no accept step.
 *
 * - Nothing paid: pay the deposit (when the team set one) or pay in full.
 * - Deposit paid: one button for the remaining balance.
 * - Paid in full: confirmation.
 * - Settled off-card: no card payment, just a note.
 *
 * Every card amount already includes the card processing fee on that payment.
 */
export function ProposalActions({
  publicToken,
  payment,
  totalPaidCents,
  totalAmountCents,
}: ProposalActionsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestPending, startRequestTransition] = useTransition();
  const [choice, setChoice] = useState<"deposit" | "full">("deposit");

  const fmt = (c: number) => formatCentsAsCurrency(c);
  const { deposit, remainingCents, offCard, feeRateLabel } = payment;
  const chargeType: "deposit" | "full" = deposit ? choice : "full";
  const chargeCents = chargeType === "deposit" && deposit ? deposit.amountCents : remainingCents;
  const isPaidInFull = totalPaidCents > 0 && remainingCents === 0;
  const isPartlyPaid = totalPaidCents > 0 && remainingCents > 0;

  const pay = () => {
    setError(null);
    startTransition(async () => {
      const result = await startProposalPayment(publicToken, chargeType);
      if (result.success) {
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error);
      }
    });
  };

  const sendChangeRequest = () => {
    startRequestTransition(async () => {
      const formData = new FormData();
      formData.set("publicToken", publicToken);
      formData.set("message", requestNote);
      const result = await requestProposalChangesAction({ success: false }, formData);
      if (result.success) {
        setRequestSent(true);
        setRequestNote("");
        setRequestModalOpen(false);
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const payButton = (label: string) => (
    <Button size="lg" className="h-11 w-full gap-2 rounded-full" disabled={pending} onClick={pay}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {pending ? "Opening secure checkout…" : label}
    </Button>
  );

  const feeNote = feeRateLabel ? ` and the ${feeRateLabel} card processing fee` : "";

  let body: React.ReactNode;
  if (offCard) {
    body = (
      <Banner tone="info">
        Your balance is being settled directly with our team, so there&apos;s nothing to pay online.
      </Banner>
    );
  } else if (isPaidInFull) {
    body = (
      <Banner tone="success">
        Paid in full. You&apos;re booked, and your confirmation email is on its way.
      </Banner>
    );
  } else if (isPartlyPaid) {
    body = (
      <>
        <Banner tone="success">{fmt(totalPaidCents)} received. Your date is locked in.</Banner>
        {payButton(`Pay remaining balance · ${fmt(remainingCents)}`)}
        <p className="text-center text-xs text-slate-500">
          Includes the card processing fee on the balance. Due before your trip.
        </p>
      </>
    );
  } else {
    body = (
      <>
        {deposit ? (
          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="How much to pay now"
          >
            <PayChoice
              active={chargeType === "deposit"}
              label="Pay the deposit"
              detail={`${fmt(deposit.amountCents)} now`}
              onClick={() => setChoice("deposit")}
            />
            <PayChoice
              active={chargeType === "full"}
              label="Pay in full"
              detail={`${fmt(remainingCents)} now`}
              onClick={() => setChoice("full")}
            />
          </div>
        ) : null}
        {payButton(
          chargeType === "deposit" ? `Pay ${fmt(chargeCents)} deposit` : `Pay ${fmt(chargeCents)}`
        )}
        <p className="text-center text-xs leading-5 text-slate-500">
          {chargeType === "deposit" && deposit
            ? `${fmt(deposit.baseCents)} deposit + ${fmt(deposit.feeCents)} card processing fee${feeRateLabel ? ` (${feeRateLabel})` : ""}. The remaining ${fmt(Math.max(0, totalAmountCents - deposit.amountCents))} is due before the trip and can be paid from this page.`
            : `Includes your charter${feeNote}. Paying confirms your booking.`}
        </p>
      </>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      ) : null}
      {requestSent ? (
        <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Change request sent. Our team will follow up shortly.
        </p>
      ) : null}
      {body}

      {!isPaidInFull ? (
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full gap-2 rounded-full border-0 bg-foreground/10 text-primary hover:bg-foreground/15 hover:text-primary"
          disabled={requestPending}
          onClick={() => setRequestModalOpen(true)}
        >
          <FileEdit className="h-4 w-4" />
          Request changes
        </Button>
      ) : null}

      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tell us what you&apos;d like to adjust. Our team gets it right away and will update your
            proposal.
          </p>
          <div className="space-y-2">
            <Label htmlFor="request-note">Your message</Label>
            <Textarea
              id="request-note"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g. Change pickup time to 2pm, add champagne..."
              className="min-h-[100px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={sendChangeRequest}
              disabled={requestPending || !requestNote.trim()}
              className="gap-2"
            >
              {requestPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Banner({ tone, children }: { tone: "success" | "info"; children: React.ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      className={
        tone === "success"
          ? "flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          : "flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800"
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function PayChoice({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={
        active
          ? "rounded-xl border-2 border-primary bg-primary/5 px-3 py-2.5 text-left"
          : "rounded-xl border border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      }
    >
      <span className="block text-sm font-semibold text-primary">{label}</span>
      <span className="block text-xs text-slate-500">{detail}</span>
    </button>
  );
}
