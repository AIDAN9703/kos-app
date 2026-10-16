"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, X } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/lib/hooks/use-toast";
import type { ActionResponse } from "@/shared/lib/types/types";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { OWNER_ROLE_LABELS } from "../owner-accounts.constants";
import type { OwnerAccountRole, OwnerTeam } from "../owner-accounts.types";

/** What the panel can do; each page passes its own (admin or the owner portal). */
export interface TeamActions {
  invite: (input: { email: string; role: OwnerAccountRole }) => Promise<ActionResponse<boolean>>;
  resend: (inviteId: string) => Promise<ActionResponse<boolean>>;
  cancel: (inviteId: string) => Promise<ActionResponse<void>>;
  setRole: (memberId: string, role: OwnerAccountRole) => Promise<ActionResponse<void>>;
  remove: (memberId: string) => Promise<ActionResponse<void>>;
}

const selectClass = "h-9 rounded-md border border-input bg-background px-2.5 text-sm";

/**
 * The people in an owner and the invites still open. With `canManage`,
 * invite, change roles and remove; without it, read-only.
 */
export function TeamPanel({
  team,
  actions,
  canManage,
  currentUserId,
  suggestedEmail,
  title = "People",
}: {
  team: OwnerTeam;
  actions: TeamActions;
  canManage: boolean;
  /** Labels the signed-in person "You". */
  currentUserId?: string;
  /** Prefills the invite (the owner's contact email when nobody has joined). */
  suggestedEmail?: string | null;
  title?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(team.members.length === 0 ? (suggestedEmail ?? "") : "");
  const [role, setRole] = useState<OwnerAccountRole>(
    team.members.length === 0 ? "OWNER" : "MANAGER"
  );
  const now = new Date();

  function run<T>(work: () => Promise<ActionResponse<T>>, after?: () => void) {
    startTransition(async () => {
      const result = await work();
      if (!result.success) {
        toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        return;
      }
      if (result.message) toast({ title: result.message });
      after?.();
      router.refresh();
    });
  }

  return (
    <GlassPanel title={title}>
      {team.members.length === 0 && team.invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody has joined yet. Invite the owner so they can see their boats and charters.
        </p>
      ) : null}

      {team.members.length > 0 ? (
        <ul className="-mx-5 divide-y divide-glass-border border-y border-glass-border">
          {team.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {m.name}
                  {m.userId === currentUserId ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email} · joined {formatDate(m.since)}
                </p>
              </div>
              {canManage ? (
                <>
                  <select
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    disabled={pending}
                    onChange={(e) =>
                      run(() => actions.setRole(m.id, e.target.value as OwnerAccountRole))
                    }
                    className={selectClass}
                  >
                    {Object.entries(OWNER_ROLE_LABELS).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="glass"
                    size="icon"
                    className="size-9 border-0"
                    aria-label={`Remove ${m.name}`}
                    disabled={pending}
                    onClick={() => run(() => actions.remove(m.id))}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {OWNER_ROLE_LABELS[m.role].label}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {team.invites.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">Invited</p>
          <ul className="grid gap-2">
            {team.invites.map((inv) => {
              const expired = inv.expiresAt < now;
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-glass-inset px-4 py-2.5 ring-1 ring-glass-border ring-inset"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {OWNER_ROLE_LABELS[inv.role].label} ·{" "}
                      {expired
                        ? "expired"
                        : `sent ${formatDate(inv.sentAt)}, open until ${formatDate(inv.expiresAt)}`}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1.5">
                      <Button
                        variant="glass"
                        className="h-8 border-0 px-3 text-xs"
                        disabled={pending}
                        onClick={() => run(() => actions.resend(inv.id))}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="glass"
                        className="h-8 border-0 px-3 text-xs"
                        disabled={pending}
                        onClick={() => run(() => actions.cancel(inv.id))}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <form
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => actions.invite({ email, role }),
              () => {
                setEmail("");
                setRole("MANAGER");
              }
            );
          }}
        >
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Invite by email</span>
            <Input
              id="team-invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">As</span>
            <select
              id="team-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as OwnerAccountRole)}
              className={`${selectClass} h-10`}
            >
              {Object.entries(OWNER_ROLE_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            className="h-10 gap-1.5 rounded-full px-5"
            disabled={pending || !email}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send invite
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            {OWNER_ROLE_LABELS[role].label}: {OWNER_ROLE_LABELS[role].description}
          </p>
        </form>
      ) : null}
    </GlassPanel>
  );
}
