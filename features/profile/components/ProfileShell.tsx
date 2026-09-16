import type { ReactNode } from "react";
import type { AccountUser } from "../profile.types";
import { ProfileIdentity, type ProfileRoles } from "./ProfileIdentity";
import { ProfileNav } from "./ProfileNav";

interface ProfileShellProps {
  account: AccountUser;
  roles: ProfileRoles;
  tripsCompleted: number;
  children: ReactNode;
}

/**
 * The profile section frame: identity + navigation down the left on desktop,
 * stacked above the content on smaller screens. Pages render inside <main>.
 */
export function ProfileShell({ account, roles, tripsCompleted, children }: ProfileShellProps) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 sm:py-10">
      <div className="lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-12 xl:gap-16">
        <aside className="space-y-5 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:self-start lg:space-y-6">
          <ProfileIdentity account={account} roles={roles} tripsCompleted={tripsCompleted} />
          <div className="hidden border-t border-gray-200 lg:block" />
          <ProfileNav roles={roles} />
        </aside>

        <main className="mt-6 min-w-0 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}
