"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Crown, Handshake, HelpCircle, LogOut, Settings, Ship } from "lucide-react";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { signOutAndGoHome } from "@/shared/lib/auth/auth-client";
import type { SessionUser } from "@/shared/lib/auth/session-user";
import { NavigationData } from "@/shared/lib/constants/navigation-data";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";

interface UserMenuProps {
  user: SessionUser | undefined | null;
  navigationData: Pick<NavigationData, "user">;
}

const ITEM =
  "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 focus:bg-slate-100 focus:text-primary";

function MenuLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <DropdownMenuItem asChild className={ITEM}>
      <Link href={href}>
        <Icon aria-hidden className="size-4 text-slate-500" />
        {label}
      </Link>
    </DropdownMenuItem>
  );
}

export default function UserMenu({ user, navigationData }: UserMenuProps) {
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 w-11 rounded-full p-0" aria-label="User menu">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user.profileImage || ""} alt="User profile image" />
              <DefaultUserAvatarFallback size="md" />
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-60 rounded-xl border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <DropdownMenuLabel className="px-2.5 py-2 font-normal">
            <p className="truncate text-sm font-semibold text-primary">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-200" />

          {navigationData.user.map((item) =>
            item.icon ? (
              <MenuLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ) : null
          )}

          <DropdownMenuSeparator className="bg-slate-200" />

          {user.isAdmin ? <MenuLink href="/admin" icon={Crown} label="Admin" /> : null}
          {user.isOwner ? <MenuLink href="/owner" icon={Ship} label="Owner portal" /> : null}
          {user.isBroker ? (
            <MenuLink href="/brokers" icon={Handshake} label="Broker portal" />
          ) : null}
          <MenuLink href="/profile/settings" icon={Settings} label="Account settings" />
          <MenuLink href="/faq" icon={HelpCircle} label="Help Center" />

          <DropdownMenuSeparator className="bg-slate-200" />

          <DropdownMenuItem className={ITEM} onSelect={() => signOutAndGoHome()}>
            <LogOut aria-hidden className="size-4 text-slate-500" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Signed out: flat text link, styled to match the main nav items.
  return (
    <Link
      href="/sign-in"
      className="text-sm font-semibold text-primary transition-colors hover:opacity-80 sm:text-base"
    >
      Sign In
    </Link>
  );
}
