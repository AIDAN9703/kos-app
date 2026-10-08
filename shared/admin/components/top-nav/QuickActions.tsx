"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ADMIN_QUICK_ACTIONS } from "@/shared/lib/constants/navigation-data";
import { circleClass } from "./controls";

/** The + circle: start a boat, booking, user or post from anywhere. */
export function QuickActions() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={circleClass} aria-label="Create" title="Create">
          <Plus />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-max max-w-[calc(100vw-2rem)] rounded-xl p-1">
        {ADMIN_QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild className="cursor-pointer gap-2 whitespace-nowrap">
            <Link href={href}>
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
