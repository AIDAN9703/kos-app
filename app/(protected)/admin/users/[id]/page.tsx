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

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, session] = await Promise.all([getUserProfile(id), getSession()]);
  if (!user) notFound();

  const stripeHref = user.stripeCustomerId
    ? `https://dashboard.stripe.com${config.stripeLive ? "" : "/test"}/customers/${user.stripeCustomerId}`
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pt-6 pb-12">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14 shrink-0">
          <AvatarImage src={user.profileImage || undefined} alt={user.name} />
          <DefaultUserAvatarFallback size="md" />
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-foreground">{user.name || user.email}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RoleChips roles={user.roles} deactivated={user.deactivated} />
            <span className="text-xs text-muted-foreground">Joined {formatDate(user.createdAt)}</span>
          </div>
        </div>
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
      </header>

      {user.deactivated ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive-soft px-4 py-3 text-sm text-destructive">
          This account is deactivated: they can&apos;t sign in. Reactivate them from the ⋯ menu.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <UserDetailsCard user={user} stripeHref={stripeHref} />
        <UserRecords user={user} />
      </div>
    </div>
  );
}
