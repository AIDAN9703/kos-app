"use client";

import { useId, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils/general-utils";
import type { OwnerAccountOption } from "../owner-accounts.types";

/** Pick which owner a boat belongs to. KOS Yachts is listed first. */
export function OwnerAccountPicker({
  owners,
  value,
  onChange,
  invalid,
  className,
}: {
  owners: OwnerAccountOption[];
  value: string;
  onChange: (accountId: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = owners.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm",
            invalid && "border-destructive",
            className
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.name ?? "Choose the owner"}
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={listId}
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
      >
        <Command>
          <CommandInput placeholder="Search owners…" />
          <CommandList className="max-h-72">
            <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
              No owner by that name. Add one on the Owners page.
            </CommandEmpty>
            <CommandGroup>
              {owners.map((owner) => (
                <CommandItem
                  key={owner.id}
                  value={`${owner.name} ${owner.id}`}
                  onSelect={() => {
                    onChange(owner.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    aria-hidden
                    className={cn("mr-2 size-4", owner.id === value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{owner.name}</span>
                  {owner.isHouse ? (
                    <span className="ml-auto text-xs text-muted-foreground">House</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
