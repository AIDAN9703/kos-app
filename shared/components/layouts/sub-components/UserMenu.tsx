"use client";

import Link from "next/link";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { NavigationData } from "@/shared/lib/constants/navigation-data";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import { Settings, HelpCircle, LogOut } from "lucide-react";

interface UserMenuProps {
  user: Session["user"] | undefined | null;
  navigationData: Pick<NavigationData, "user">;
}

export default function UserMenu({ user, navigationData }: UserMenuProps) {
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 w-11 rounded-full p-0" aria-label="User menu">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user?.profileImage || user?.image || ""} alt="User profile image" />
              <DefaultUserAvatarFallback size="md" />
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="w-[280px] p-4 bg-white rounded-xl shadow-xl"
        >
          {/* Shared menu item styles - parent handles spacing */}
          <div className="space-y-1">
            {/* Section 1: User Navigation */}
            <div>
              {navigationData.user.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    className="cursor-pointer py-2.5 text-base font-semibold text-primary hover:bg-gray-50 rounded-lg focus:bg-gray-50"
                    asChild
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      {Icon && <Icon strokeWidth={2.5} className="h-5 w-5" />}
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator className="my-2 border bg-gray-200" />

            {/* Section 2: Account & Help */}
            <div>
              <DropdownMenuItem
                className="cursor-pointer py-2.5 text-base font-normal text-muted-foreground hover:bg-gray-50 rounded-lg focus:bg-gray-50"
                asChild
              >
                <Link href="/profile/settings" className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span>Account settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer py-2.5 text-base font-normal text-muted-foreground hover:bg-gray-50 rounded-lg focus:bg-gray-50"
                asChild
              >
                <Link href="/faq" className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                  <span>Help Center</span>
                </Link>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="my-2 border bg-gray-200" />

            {/* Section 3: Promotional "List your boat" */}
            <Link
              href={user.isOwner ? "/profile/owner" : "/services/charter-management"}
              className="block group px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary transition-colors">
                    List your boat
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start earning from your boat today!
                  </p>
                </div>
                <Image
                  src="/images/boat-owner.svg"
                  alt="Boat"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover flex-shrink-0"
                />
              </div>
            </Link>

            <DropdownMenuSeparator className="my-2 border bg-gray-200" />

            {/* Section 4: Log out */}
            <DropdownMenuItem
              className="cursor-pointer py-2.5 text-base font-semibold text-primary hover:bg-gray-50 rounded-lg focus:bg-gray-50"
              onClick={() => signOut()}
            >
              <div className="flex items-center gap-3">
                <LogOut strokeWidth={2.5} className="h-4 w-4" />
                <span>Log out</span>
              </div>
            </DropdownMenuItem>
          </div>
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
