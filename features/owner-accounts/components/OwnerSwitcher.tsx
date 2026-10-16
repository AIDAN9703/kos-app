"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { switchMyOwnerAction } from "../owner-accounts.actions";
import { OWNER_ROLE_LABELS } from "../owner-accounts.constants";
import type { OwnerMembership } from "../owner-accounts.types";

/** For people in more than one owner: which one the portal shows. */
export function OwnerSwitcher({
  current,
  memberships,
}: {
  current: string;
  memberships: OwnerMembership[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = memberships.find((m) => m.accountId === current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        <span className="truncate">{active?.accountName}</span>
        <ChevronsUpDown aria-hidden className="size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Switch owner
        </DropdownMenuLabel>
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.accountId}
            onSelect={() =>
              startTransition(async () => {
                if (m.accountId === current) return;
                await switchMyOwnerAction(m.accountId);
                router.push("/owner");
                router.refresh();
              })
            }
            className="gap-2"
          >
            <Check
              aria-hidden
              className={m.accountId === current ? "size-4 opacity-100" : "size-4 opacity-0"}
            />
            <span className="min-w-0 flex-1 truncate">{m.accountName}</span>
            <span className="text-xs text-muted-foreground">{OWNER_ROLE_LABELS[m.role].label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
