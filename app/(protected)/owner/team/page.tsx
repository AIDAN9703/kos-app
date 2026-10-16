import { redirect } from "next/navigation";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { requireOwner } from "@/shared/lib/utils/auth-utils";
import {
  cancelMyInviteAction,
  inviteToMyOwnerAction,
  removeMyMemberAction,
  resendMyInviteAction,
  setMyMemberRoleAction,
} from "@/features/owner-accounts/owner-accounts.actions";
import { getMyTeam } from "@/features/owner-accounts/owner-accounts.data";
import { TeamPanel } from "@/features/owner-accounts/components/TeamPanel";
import { getMyOwnerView } from "@/features/owner-dashboard/owner.data";

/**
 * The people who can see this owner's boats: Owners (everything, money
 * included) and Managers (boats, calendar and charters). Owners only.
 */
export default async function OwnerTeamPage() {
  const session = await requireOwner();
  const view = await getMyOwnerView();
  if (view.role !== "OWNER") redirect("/owner");
  const team = await getMyTeam();

  return (
    <GlassPage>
      <GlassHeader
        title="Team"
        meta={<span>Invite a captain or boat manager to see the boats and charters.</span>}
      />
      <div className="max-w-3xl">
        <TeamPanel
          title={view.accountName}
          team={team}
          canManage
          currentUserId={session.user.id}
          actions={{
            invite: inviteToMyOwnerAction,
            resend: resendMyInviteAction,
            cancel: cancelMyInviteAction,
            setRole: setMyMemberRoleAction,
            remove: removeMyMemberAction,
          }}
        />
      </div>
    </GlassPage>
  );
}
