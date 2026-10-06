import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import { UserQuickActions } from "@/features/users/components/AdminUserQuickActions";
import type { CaptainStatus, CrewStatus } from "@/database/types";

interface UserProfileHeaderProps {
  user: {
    id: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImage?: string | null;
    status?: string | null;
    bio?: string | null;
  };
  captainProfileStatus: CaptainStatus | null;
  crewProfileStatus: CrewStatus | null;
  isCompact?: boolean;
}

export function UserProfileHeader({
  user,
  captainProfileStatus,
  crewProfileStatus,
  isCompact = false,
}: UserProfileHeaderProps) {
  const displayName =
    (user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : null) ||
    user.username ||
    "User" + user.id;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className={isCompact ? "h-14 w-14 shrink-0" : "h-16 w-16 shrink-0"}>
          <AvatarImage src={user.profileImage || undefined} alt={displayName} />
          <DefaultUserAvatarFallback size={isCompact ? "sm" : "md"} />
        </Avatar>

        <div className="min-w-0">
          <h1
            className={`${isCompact ? "text-xl" : "text-2xl"} font-bold tracking-tight text-foreground`}
          >
            {displayName}
          </h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">ID: {user.id}</p>
          {!isCompact && user.bio ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 sm:ml-4">
        <UserQuickActions
          userId={user.id}
          displayName={displayName}
          captainProfileStatus={captainProfileStatus}
          crewProfileStatus={crewProfileStatus}
        />
      </div>
    </div>
  );
}
