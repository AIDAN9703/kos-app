"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Landmark, Loader2, Smartphone } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/lib/hooks/use-toast";
import type { ActionResponse } from "@/shared/lib/types/types";
import { cn } from "@/shared/lib/utils/general-utils";
import {
  chooseMyPayoutMethodAction,
  openMyStripeDashboardAction,
  saveMyZelleAction,
  startMyDirectDepositAction,
} from "../owner-accounts.actions";
import { zelleLabel } from "../owner-accounts.constants";
import type { OwnerPayoutMethod, OwnerPayoutSetup } from "../owner-accounts.types";

const chosenChip =
  "rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/25 ring-inset";

/**
 * How KOS pays this owner: direct deposit (they set it up on Stripe's site;
 * KOS never sees their bank details) or Zelle. Owners only.
 */
export function PayoutSetupCard({
  setup,
  linkExpired,
}: {
  setup: OwnerPayoutSetup;
  /** Back from an expired Stripe setup link. */
  linkExpired?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editingZelle, setEditingZelle] = useState(false);
  const [zelle, setZelle] = useState(setup.zelleContact ? zelleLabel(setup.zelleContact) : "");
  const [zelleError, setZelleError] = useState<string | null>(null);

  function run<T>(work: () => Promise<ActionResponse<T>>, after?: (data: T | undefined) => void) {
    startTransition(async () => {
      const result = await work();
      if (!result.success) {
        toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        return;
      }
      if (result.message) toast({ title: result.message });
      after?.(result.data);
      router.refresh();
    });
  }

  /** Stripe links are one-time; go there in this tab. */
  function goToStripe(work: () => Promise<ActionResponse<string>>) {
    startTransition(async () => {
      const result = await work();
      if (!result.success || !result.data) {
        toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        return;
      }
      window.location.href = result.data;
    });
  }

  function saveZelle(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setZelleError(null);
      const result = await saveMyZelleAction({ zelleContact: zelle });
      if (!result.success) {
        setZelleError(
          result.fieldErrors?.zelleContact?.[0] ?? result.error ?? "Check the email or phone."
        );
        return;
      }
      toast({ title: result.message ?? "Saved" });
      setEditingZelle(false);
      router.refresh();
    });
  }

  const choose = (method: OwnerPayoutMethod) => run(() => chooseMyPayoutMethodAction(method));
  const isChosen = (method: OwnerPayoutMethod) => setup.payoutMethod === method;

  return (
    <GlassPanel title="How KOS pays you">
      <p className="text-sm text-muted-foreground">
        KOS pays you for each charter once the trip is over, and emails you when it goes out.
      </p>

      <ul className="-mx-5 -mb-5 divide-y divide-glass-border border-t border-glass-border">
        <li className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Landmark aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              Direct deposit
              {isChosen("STRIPE") ? <span className={chosenChip}>How you&apos;re paid</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {setup.stripeReady
                ? `Automatically the day after each trip, to your bank${setup.stripeBankLast4 ? ` ending ${setup.stripeBankLast4}` : ""}.`
                : setup.stripeStarted
                  ? linkExpired
                    ? "That setup link expired. Pick up where you left off."
                    : "Stripe still needs a few details from you."
                  : "Paid automatically the day after each trip, straight to your bank. Set up securely with Stripe; KOS never sees your bank details."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {setup.stripeReady ? (
              <>
                {isChosen("STRIPE") ? null : (
                  <Button
                    variant="glass"
                    className="h-9 border-0 px-4"
                    disabled={pending}
                    onClick={() => choose("STRIPE")}
                  >
                    Use this
                  </Button>
                )}
                <Button
                  variant="glass"
                  className="h-9 gap-1.5 border-0 px-4"
                  disabled={pending}
                  onClick={() => goToStripe(openMyStripeDashboardAction)}
                >
                  Stripe dashboard
                  <ExternalLink className="size-3.5" />
                </Button>
              </>
            ) : (
              <Button
                className="h-9 rounded-full px-4"
                disabled={pending}
                onClick={() => goToStripe(startMyDirectDepositAction)}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {setup.stripeStarted ? "Finish setup" : "Set up direct deposit"}
              </Button>
            )}
          </div>
        </li>

        <li className="grid gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Smartphone aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                Zelle
                {isChosen("ZELLE") ? (
                  <span className={chosenChip}>How you&apos;re paid</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {setup.zelleContact
                  ? zelleLabel(setup.zelleContact)
                  : "Sent by the KOS team to the email or phone your Zelle uses."}
              </p>
            </div>
            {editingZelle ? null : (
              <div className="flex flex-wrap gap-2">
                {setup.zelleContact && !isChosen("ZELLE") ? (
                  <Button
                    variant="glass"
                    className="h-9 border-0 px-4"
                    disabled={pending}
                    onClick={() => choose("ZELLE")}
                  >
                    Use this
                  </Button>
                ) : null}
                <Button
                  variant="glass"
                  className="h-9 border-0 px-4"
                  onClick={() => {
                    setZelle(setup.zelleContact ? zelleLabel(setup.zelleContact) : "");
                    setZelleError(null);
                    setEditingZelle(true);
                  }}
                >
                  {setup.zelleContact ? "Change" : "Add"}
                </Button>
              </div>
            )}
          </div>
          {editingZelle ? (
            <form
              onSubmit={saveZelle}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            >
              <div className="grid gap-1">
                <Input
                  id="zelle-contact"
                  value={zelle}
                  onChange={(e) => setZelle(e.target.value)}
                  placeholder="Email or phone your Zelle uses"
                  aria-invalid={zelleError ? true : undefined}
                  className={cn(zelleError && "border-destructive")}
                />
                {zelleError ? <p className="text-xs text-destructive">{zelleError}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="glass"
                  className="h-10 border-0"
                  onClick={() => setEditingZelle(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-10 rounded-full px-5" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </form>
          ) : null}
        </li>
      </ul>
    </GlassPanel>
  );
}
