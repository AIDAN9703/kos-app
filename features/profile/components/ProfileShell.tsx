import type { ReactNode } from "react";
import type { AccountUser } from "../profile.types";
import { ProfileIdentity, type ProfileRoles } from "./ProfileIdentity";
import { ProfileNav } from "./ProfileNav";

interface ProfileShellProps {
  account: AccountUser;
  roles: ProfileRoles;
  children: ReactNode;
}

/**
 * The profile section frame: identity + navigation down the left on desktop,
 * stacked above the content on smaller screens. Pages render inside <main>.
 */
export function ProfileShell({ account, roles, children }: ProfileShellProps) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 sm:py-10 lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-12 xl:gap-16">
      <aside className="space-y-5 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:space-y-6 lg:self-start">
        <ProfileIdentity account={account} roles={roles} />
        <ProfileNav roles={roles} />
      </aside>
      <main className="mt-6 min-w-0 lg:mt-0">{children}</main>
    </div>
  );
}
