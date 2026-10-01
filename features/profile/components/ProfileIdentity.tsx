import { format } from "date-fns";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import type { AccountUser } from "../profile.types";

export interface ProfileRoles {
  isAdmin: boolean;
  isOwner: boolean;
  isCaptain: boolean;
}

interface ProfileIdentityProps {
  account: AccountUser;
  roles: ProfileRoles;
}

/**
 * Who's signed in — photo, name, tenure, roles. Centered at the top of
 * the left rail on desktop; a compact row above the tab strip on phones.
 */
export function ProfileIdentity({ account, roles }: ProfileIdentityProps) {
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.username;
  const roleChips = [
    roles.isOwner && "Owner",
    roles.isCaptain && "Captain",
    roles.isAdmin && "Admin",
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <div className="flex items-center gap-4 lg:flex-col lg:gap-4 lg:text-center">
      <Avatar className="h-16 w-16 shrink-0 border border-gray-200 shadow-sm lg:h-24 lg:w-24">
        <AvatarImage src={account.profileImage || undefined} alt="" />
        <DefaultUserAvatarFallback size="lg" />
      </Avatar>

      <div className="min-w-0 lg:w-full">
        <h2 className="truncate text-lg font-bold leading-tight text-primary lg:text-xl">{name}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Member since {format(account.createdAt, "MMMM yyyy")}
        </p>
        {roleChips.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5 lg:justify-center">
            {roleChips.map((chip) => (
              <li
                key={chip}
                className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-deep"
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
