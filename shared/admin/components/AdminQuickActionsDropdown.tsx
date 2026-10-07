"use client";

import Link from "next/link";
import { Plus, Ship, Calendar, User, PenLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import { ADMIN_QUICK_ACTIONS } from "@/shared/lib/constants/navigation-data";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Create Boat": Ship,
  "Create Booking": Calendar,
  "Create User": User,
  "Create Blog Post": PenLine,
};

export function AdminQuickActionsDropdown() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Quick actions"
          title="Quick actions"
        >
          <Plus className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-max max-w-[calc(100vw-2rem)] p-1" align="start">
        {ADMIN_QUICK_ACTIONS.map((action) => {
          const Icon = ACTION_ICONS[action.label];
          return (
            <DropdownMenuItem
              key={action.href}
              asChild
              className="cursor-pointer whitespace-nowrap"
            >
              <Link href={action.href} className="flex items-center gap-2">
                {Icon && <Icon className="size-4 shrink-0" />}
                {action.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
