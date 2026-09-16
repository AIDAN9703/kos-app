import Link from "next/link";
import { Settings } from "lucide-react";
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
  tripsCompleted: number;
}

/**
 * Who's signed in — photo, name, tenure, roles — with the settings gear tucked
 * against the photo. Sits at the top of the left rail on desktop and above the
 * tab strip on phones.
 */
export function ProfileIdentity({ account, roles, tripsCompleted }: ProfileIdentityProps) {
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.username;
  const roleChips = [
    roles.isOwner && "Owner",
    roles.isCaptain && "Captain",
    roles.isAdmin && "Admin",
  ].filter((chip): chip is string => Boolean(chip));
  const home = [account.city, account.state].filter(Boolean).join(", ");

  return (
    <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
      <div className="relative shrink-0">
        <Avatar className="h-16 w-16 border border-gray-200 lg:h-20 lg:w-20">
          <AvatarImage src={account.profileImage || undefined} alt="" />
          <DefaultUserAvatarFallback size="lg" />
        </Avatar>
        <Link
          href="/profile/settings"
          aria-label="Account settings"
          title="Account settings"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 shadow-sm transition-colors hover:text-primary"
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold leading-tight text-primary lg:text-xl">{name}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Member since {format(account.createdAt, "MMMM yyyy")}
          {home ? ` · ${home}` : ""}
        </p>
        {roleChips.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
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
        <p className="mt-3 hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground lg:block">
          {tripsCompleted} {tripsCompleted === 1 ? "trip" : "trips"} completed
        </p>
      </div>
    </div>
  );
}
