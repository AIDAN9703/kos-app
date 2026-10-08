"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EditableField } from "@/shared/components/EditableField";
import { GlassPanel } from "@/shared/admin/components/glass";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn, formatPhoneNumberForDisplay } from "@/shared/lib/utils/general-utils";
import type { Role } from "@/shared/lib/auth/permissions";
import { setUserAccess, updateUserDetails } from "@/features/users/user.actions";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/features/users/user-roles.constants";
import type { AdminUserProfile } from "@/features/users/user.types";
import { RoleChips } from "./RoleChips";
import { RoleToggles } from "./RoleToggles";

const SIGN_IN_LABELS: Record<string, string> = { credential: "Email and password", google: "Google" };

function VerifiedChip({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        verified ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
      )}
    >
      {verified ? "Verified" : "Not verified"}
    </span>
  );
}

function ReadOnlyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <p className="text-sm font-medium text-primary">{label}</p>
      <div className="mt-0.5 text-[15px] text-foreground">{children}</div>
    </div>
  );
}

/** Admin / broker / owner access, edited in place like the other rows. */
function AccessRow({ userId, roles }: { userId: string; roles: Role[] }) {
  const { toast } = useToast();
  const assigned = roles.filter((r): r is AssignableRole => (ASSIGNABLE_ROLES as readonly Role[]).includes(r));
  const other = roles.filter((r) => r === "captain" || r === "crew");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AssignableRole[]>(assigned);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.length !== assigned.length || draft.some((r) => !assigned.includes(r));

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await setUserAccess(userId, draft);
    setSaving(false);
    if (result.success) {
      setEditing(false);
      toast({ title: "Saved", description: result.message });
    } else {
      setError(result.error ?? "Couldn't change their access.");
    }
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-border py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Access</p>
          <div className="mt-1">
            {assigned.length + other.length > 0 ? (
              <RoleChips roles={[...assigned, ...other]} />
            ) : (
              <p className="text-[15px] text-muted-foreground">Customer</p>
            )}
          </div>
          {other.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Captain and crew are set from the ⋯ menu.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(assigned);
            setError(null);
            setEditing(true);
          }}
          className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-border py-4">
      <p className="text-sm font-medium text-primary">Access</p>
      <div className="mt-3">
        <RoleToggles value={draft} onChange={setDraft} disabled={saving} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">None ticked = a customer. Changes apply on their next click.</p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** The person's details, each row edited in place. */
export function UserDetailsCard({ user, stripeHref }: { user: AdminUserProfile; stripeHref: string | null }) {
  const save = (values: Record<string, string | null>) => updateUserDetails(user.id, values);

  return (
    <GlassPanel title="Details" className="gap-0 px-5 pb-1">
      <EditableField
        label="Name"
        fields={[
          { key: "firstName", label: "First name", required: true, half: true },
          { key: "lastName", label: "Last name", required: true, half: true },
        ]}
        values={{ firstName: user.firstName, lastName: user.lastName }}
        displayValue={[user.firstName, user.lastName].filter(Boolean).join(" ") || null}
        onSave={save}
      />
      <EditableField
        label="Email"
        fields={[{ key: "email", label: "Email", type: "email", required: true }]}
        values={{ email: user.email }}
        aside={<VerifiedChip verified={user.emailVerified} />}
        editDescription="A confirmation link will be sent to the user."
        onSave={save}
      />
      <EditableField
        label="Phone"
        fields={[{ key: "phoneNumber", label: "Phone", type: "tel", placeholder: "+1 305 555 0123" }]}
        values={{ phoneNumber: user.phoneNumber }}
        displayValue={formatPhoneNumberForDisplay(user.phoneNumber) || null}
        aside={user.phoneNumber ? <VerifiedChip verified={user.phoneVerified} /> : null}
        onSave={save}
      />
      <AccessRow userId={user.id} roles={user.roles} />
      <ReadOnlyRow label="Sign-in methods">
        {user.signInMethods.length > 0 ? (
          user.signInMethods.map((m) => SIGN_IN_LABELS[m] ?? m).join(" · ")
        ) : (
          <span className="text-muted-foreground">Not set up yet — they haven&apos;t chosen a password</span>
        )}
      </ReadOnlyRow>
      {stripeHref ? (
        <ReadOnlyRow label="Stripe customer">
          <a
            href={stripeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            Open in Stripe
            <ExternalLink className="size-3.5" />
          </a>
        </ReadOnlyRow>
      ) : null}
    </GlassPanel>
  );
}
