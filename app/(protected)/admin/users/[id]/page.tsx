import { notFound } from "next/navigation";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import { formatDate } from "@/shared/lib/utils/general-utils";
import config from "@/shared/lib/config";
import { getSession } from "@/shared/lib/utils/auth-utils";
import { getUserProfile } from "@/features/users/user.data";
import { RoleChips } from "@/features/users/components/RoleChips";
import { UserActionsMenu } from "@/features/users/components/UserActionsMenu";
import { UserDetailsCard } from "@/features/users/components/UserDetailsCard";
import { UserRecords } from "@/features/users/components/UserRecords";
import { UserStats } from "@/features/users/components/UserStats";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, session] = await Promise.all([getUserProfile(id), getSession()]);
  if (!user) notFound();

  const stripeHref = user.stripeCustomerId
    ? `https://dashboard.stripe.com${config.stripeLive ? "" : "/test"}/customers/${user.stripeCustomerId}`
    : null;

  return (
    <GlassPage>
      <GlassHeader
        leading={
          <Avatar className="size-16 shrink-0 ring-2 ring-glass-border">
            <AvatarImage src={user.profileImage || undefined} alt={user.name} />
            <DefaultUserAvatarFallback size="lg" />
          </Avatar>
        }
        title={user.name || user.email}
        meta={
          <>
            <RoleChips roles={user.roles} deactivated={user.deactivated} />
            <span>Joined {formatDate(user.createdAt)}</span>
          </>
        }
        actions={
          <UserActionsMenu
            userId={user.id}
            name={user.name || user.email}
            hasPassword={user.signInMethods.includes("credential")}
            deactivated={user.deactivated}
            canDelete={user.canDelete}
            isSelf={session?.user.id === user.id}
            captainStatus={user.captainStatus}
            crewStatus={user.crewStatus}
          />
        }
      />

      {user.deactivated ? (
        <p className="glass-panel mb-4 px-5 py-3 text-sm text-destructive">
          This account is deactivated: they can&apos;t sign in. Reactivate them from the ⋯ menu.
        </p>
      ) : null}

      <UserStats user={user} />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <UserDetailsCard user={user} stripeHref={stripeHref} />
        <UserRecords user={user} />
      </div>
    </GlassPage>
  );
}
