"use client";

import Link from "next/link";
import { Globe, LogOut } from "lucide-react";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { signOutAndGoHome } from "@/shared/lib/auth/auth-client";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";

export interface TopNavUser {
  name: string;
  email: string;
  image: string | null;
}

/** The avatar: who's signed in, the public website, and sign out. */
export function AccountMenu({ user }: { user: TopNavUser }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-11 ring-1 ring-glass-border">
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <DefaultUserAvatarFallback size="sm" />
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-60 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href="/">
            <Globe className="size-4" />
            View the website
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          onSelect={() => void signOutAndGoHome()}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
