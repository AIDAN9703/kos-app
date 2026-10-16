import { notFound } from "next/navigation";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import {
  cancelOwnerInviteAction,
  inviteToOwnerAction,
  removeOwnerMemberAction,
  resendOwnerInviteAction,
  setOwnerMemberRoleAction,
} from "@/features/owner-accounts/owner-accounts.actions";
import {
  getOwnerAccount,
  listMovableBoats,
  listOwnerAccountOptions,
} from "@/features/owner-accounts/owner-accounts.data";
import { getOwnerPayouts } from "@/features/owner-accounts/owner-payouts.data";
import { OWNER_KIND_LABELS } from "@/features/owner-accounts/owner-accounts.constants";
import { OwnerBoatsPanel } from "@/features/owner-accounts/components/admin/OwnerBoatsPanel";
import { OwnerDetailsPanel } from "@/features/owner-accounts/components/admin/OwnerDetailsPanel";
import { OwnerPayoutsPanel } from "@/features/owner-accounts/components/admin/OwnerPayoutsPanel";
import { TeamPanel } from "@/features/owner-accounts/components/TeamPanel";

/** One owner: what KOS owes and has paid them, their boats, details and people. */
export default async function AdminOwnerPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, requireAuth()]);
  const [account, movable, owners, payouts] = await Promise.all([
    getOwnerAccount(id),
    listMovableBoats(),
    listOwnerAccountOptions(),
    getOwnerPayouts(id),
  ]);
  if (!account) notFound();

  return (
    <GlassPage>
      <GlassHeader
        back="/admin/owners"
        eyebrow={account.isHouse ? "House account" : "Owner"}
        title={account.name}
        meta={
          <span>
            {OWNER_KIND_LABELS[account.kind]} · {account.boats.length}{" "}
            {account.boats.length === 1 ? "boat" : "boats"}
            {account.isHouse
              ? " held until their owners are set up"
              : ` · ${account.members.length} ${account.members.length === 1 ? "person" : "people"}`}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-7">
          <OwnerPayoutsPanel
            accountId={account.id}
            ownerName={account.name}
            isHouse={account.isHouse}
            setup={account}
            payouts={payouts}
          />
          <OwnerBoatsPanel
            accountId={account.id}
            isHouse={account.isHouse}
            boats={account.boats}
            movable={movable}
            owners={owners}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
          <OwnerDetailsPanel account={account} />
          {account.isHouse ? null : (
            <TeamPanel
              team={{ members: account.members, invites: account.invites }}
              canManage
              currentUserId={session.user.id}
              suggestedEmail={account.contactEmail}
              actions={{
                invite: inviteToOwnerAction.bind(null, account.id),
                resend: resendOwnerInviteAction.bind(null, account.id),
                cancel: cancelOwnerInviteAction.bind(null, account.id),
                setRole: setOwnerMemberRoleAction.bind(null, account.id),
                remove: removeOwnerMemberAction.bind(null, account.id),
              }}
            />
          )}
        </div>
      </div>
    </GlassPage>
  );
}
