"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import {
  deleteOwnerAccountAction,
  refreshOwnerDirectDepositAction,
  updateOwnerAccountAction,
} from "../../owner-accounts.actions";
import {
  OWNER_KIND_LABELS,
  PAYOUT_METHOD_LABELS,
  zelleLabel,
} from "../../owner-accounts.constants";
import type { OwnerAccountDetail } from "../../owner-accounts.types";
import { OwnerForm, ownerInput, type OwnerFormValues } from "./OwnerForm";

function valuesFrom(a: OwnerAccountDetail): OwnerFormValues {
  return {
    name: a.name,
    kind: a.kind,
    contactEmail: a.contactEmail ?? "",
    contactPhone: a.contactPhone ?? "",
    zelleContact: a.zelleContact ? zelleLabel(a.zelleContact) : "",
    adminNotes: a.adminNotes ?? "",
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

/** Who the owner is and how KOS pays them; edited in place. */
export function OwnerDetailsPanel({ account }: { account: OwnerAccountDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => valuesFrom(account));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();
  const canDelete = !account.isHouse && account.boats.length === 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateOwnerAccountAction(account.id, ownerInput(values));
      if (!result.success) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) {
          toast({ title: "That didn't save", description: result.error, variant: "destructive" });
        }
        return;
      }
      toast({ title: result.message ?? "Saved" });
      setEditing(false);
      router.refresh();
    });
  }

  function checkStripe() {
    startTransition(async () => {
      const result = await refreshOwnerDirectDepositAction(account.id);
      toast({
        title: result.success ? (result.message ?? "Checked") : "That didn't work",
        description: result.success ? undefined : result.error,
        variant: result.success ? undefined : "destructive",
      });
      if (result.success) router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteOwnerAccountAction(account.id);
      if (!result.success) {
        toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: result.message ?? "Deleted" });
      router.push("/admin/owners");
    });
  }

  return (
    <GlassPanel
      title="Details"
      aside={
        editing ? null : (
          <Button
            variant="glass"
            className="h-9 border-0 px-4"
            onClick={() => {
              setValues(valuesFrom(account));
              setErrors({});
              setEditing(true);
            }}
          >
            Edit
          </Button>
        )
      }
    >
      {editing ? (
        <form onSubmit={save} className="grid gap-4">
          <OwnerForm values={values} onChange={setValues} errors={errors} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="rounded-full px-5" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
            <Button
              type="button"
              variant="glass"
              className="border-0"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            {canDelete ? (
              <Button
                type="button"
                variant="glass"
                className="ml-auto border-0 text-destructive"
                onClick={remove}
                disabled={pending}
              >
                Delete owner
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <Row label="Type" value={OWNER_KIND_LABELS[account.kind]} />
          <Row label="Contact email" value={account.contactEmail} />
          <Row label="Contact phone" value={account.contactPhone} />
          <Row
            label="Paid by"
            value={
              account.payoutMethod ? PAYOUT_METHOD_LABELS[account.payoutMethod] : "Not chosen yet"
            }
          />
          <Row
            label="Direct deposit"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {account.stripeReady
                  ? `Ready${account.stripeBankLast4 ? `, bank ending ${account.stripeBankLast4}` : ""}`
                  : account.stripeStarted
                    ? "Started; Stripe still needs details from them"
                    : "Not set up (they do it in their portal)"}
                {account.stripeStarted ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={checkStripe}
                    className="text-xs font-semibold text-primary-strong underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    Check with Stripe
                  </button>
                ) : null}
              </span>
            }
          />
          <Row
            label="Zelle"
            value={account.zelleContact ? zelleLabel(account.zelleContact) : null}
          />
          <Row label="Notes" value={account.adminNotes} />
        </dl>
      )}
    </GlassPanel>
  );
}
