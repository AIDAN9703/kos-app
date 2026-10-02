"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, Copy, Loader2, Send } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { sendProposalUpdate, shareProposalLink } from "@/features/bookings/actions/deal.actions";

export interface SendToCustomerData {
  bookingId: string;
  publicToken: string;
  /** "proposal" while PROPOSED; "payment" once booked with money owed. */
  stage: "proposal" | "payment";
  customerEmail: string | null;
  customerPhone: string | null;
  /** When the customer last got the link; null = never sent. */
  lastSentAt: string | null;
  /** Admin edits since that send — the customer's link has changed. */
  editsSinceSend: number;
  /** Off-card settlement — the link shows the price but takes no card payment. */
  serviceFeeWaived: boolean;
}

/**
 * The bottom of the Breakdown card: send the customer their one link, which
 * always shows the breakdown above and lets them pay by card. Pick email
 * and/or text, then send or copy. No dialog — after Edit trip → Done the
 * breakdown updates in place and this says the customer hasn't seen it yet.
 */
export function SendToCustomer({ data }: { data: SendToCustomerData }) {
  const {
    bookingId,
    publicToken,
    stage,
    customerEmail,
    customerPhone,
    lastSentAt,
    editsSinceSend,
    serviceFeeWaived,
  } = data;
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState(Boolean(customerEmail));
  const [sms, setSms] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasUnsentChanges = lastSentAt != null && editsSinceSend > 0;
  const sendLabel =
    stage === "payment"
      ? "Resend payment link"
      : !lastSentAt
        ? "Send proposal"
        : hasUnsentChanges
          ? "Send update"
          : "Resend proposal";

  async function handleSend() {
    setSending(true);
    try {
      const r = await sendProposalUpdate(bookingId, { email, sms });
      toast(
        r.success
          ? { title: "Sent", description: r.message }
          : { title: "Not sent", description: r.error, variant: "destructive" }
      );
      if (r.success) router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/bookings/proposal/${publicToken}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    void shareProposalLink(bookingId);
  }

  return (
    <section className="space-y-4 border-t border-border/50 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Send to customer</h3>
        {hasUnsentChanges ? (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
            {editsSinceSend} {editsSinceSend === 1 ? "change" : "changes"} not sent yet
          </span>
        ) : lastSentAt ? (
          <span className="text-xs text-muted-foreground">
            Last sent {formatDistanceToNowStrict(new Date(lastSentAt))} ago
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not sent yet</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {serviceFeeWaived
          ? "Being settled off-card, so the link shows the price without a pay button."
          : "The link lets them pay the deposit (when one is set) or the full amount by card."}
      </p>

      <div className="flex flex-wrap items-center gap-5 text-sm">
        <label className={cn("flex items-center gap-2", !customerEmail && "opacity-40")}>
          <Checkbox
            checked={email}
            onCheckedChange={(v) => setEmail(v === true)}
            disabled={!customerEmail}
          />
          Email
        </label>
        <label className={cn("flex items-center gap-2", !customerPhone && "opacity-40")}>
          <Checkbox
            checked={sms}
            onCheckedChange={(v) => setSms(v === true)}
            disabled={!customerPhone}
          />
          Text
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          className="flex-1 gap-1.5 rounded-full"
          onClick={handleSend}
          disabled={sending || (!email && !sms)}
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {sendLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="gap-1.5 rounded-full text-muted-foreground"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </section>
  );
}
