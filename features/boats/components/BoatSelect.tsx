"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Ship, X } from "lucide-react";
import { useBoatsForAdminSelect, useBoatForAdminSelect } from "@/features/boats/hooks/useBoatsForAdminSelect";
import type { BoatForAdminSelect } from "@/features/boats/boat.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useDebounce } from "@/shared/lib/hooks/useDebounce";
import Image from "next/image";

interface BoatSelectProps {
  value: string;
  selectedBoat?: BoatForAdminSelect | null;
  onChange: (boatId: string, boat: BoatForAdminSelect | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When false, hides the X control (e.g. booking must always have a boat). Default true. */
  showClearButton?: boolean;
}

export function BoatSelect({
  value,
  selectedBoat,
  onChange,
  placeholder = "Select boat",
  disabled,
  showClearButton = true,
}: BoatSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch selected boat when we have value but no selectedBoat (e.g. from persistence)
  const { data: fetchedBoat } = useBoatForAdminSelect(value && !selectedBoat ? value : "");

  // Fetch boats based on search (search if 2+ chars, else show recent/all)
  const { data: boatsData, isLoading } = useBoatsForAdminSelect(
    debouncedSearch.length >= 2 ? debouncedSearch : undefined
  );
  const boats = boatsData ?? [];

  const displayBoat = selectedBoat ?? (value ? fetchedBoat : null);

  const handleSelectBoat = (boat: BoatForAdminSelect) => {
    onChange(boat.id, boat);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", null);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-11 border-border focus-visible:ring-2 focus-visible:ring-ring rounded-lg transition-all",
              !value && "text-muted-foreground"
            )}
          >
            {displayBoat ? (
              <div className="flex items-center gap-2 text-left">
                {displayBoat.mainImage ? (
                  <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
                    <Image
                      src={displayBoat.mainImage}
                      alt={displayBoat.name}
                      fill
                      className="object-cover"
                      sizes="24px"
                    />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                    <Ship className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 truncate">
                  <div className="font-medium">{displayBoat.name}</div>
                  {(displayBoat.locationLabel || displayBoat.capacity) && (
                    <div className="text-xs text-muted-foreground truncate">
                      {[displayBoat.locationLabel, displayBoat.capacity ? `${displayBoat.capacity} guests` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0 rounded-lg border-border bg-popover text-popover-foreground z-50"
          sideOffset={4}
        >
          <Command className="rounded-lg border-0">
            <CommandInput
              placeholder="Search boats by name, make, or location..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9 border-0"
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              {isLoading && (
                <CommandEmpty className="py-6 text-center text-sm">
                  Loading boats...
                </CommandEmpty>
              )}
              {!isLoading && boats.length === 0 && searchQuery.length < 2 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  Type at least 2 characters to search
                </CommandEmpty>
              )}
              {!isLoading && boats.length === 0 && searchQuery.length >= 2 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  No boats found for &quot;{searchQuery}&quot;
                </CommandEmpty>
              )}
              {!isLoading && boats.length > 0 && (
                <CommandGroup className="p-1">
                  {boats.map((boat) => (
                    <CommandItem
                      key={boat.id}
                      value={`${boat.name} ${boat.locationLabel ?? ""}`}
                      onSelect={() => handleSelectBoat(boat)}
                      className="cursor-pointer hover:bg-accent aria-selected:bg-accent px-2 py-2 rounded-md"
                    >
                      <div className="flex items-center gap-3 w-full">
                        {boat.mainImage ? (
                          <div className="relative h-8 w-12 shrink-0 overflow-hidden rounded">
                            <Image
                              src={boat.mainImage}
                              alt={boat.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-muted">
                            <Ship className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {boat.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[boat.locationLabel, boat.capacity ? `${boat.capacity} guests` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                        {boat.id === value && (
                          <Check className="ml-2 h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showClearButton && displayBoat && !disabled && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          onClick={handleClearSelection}
          aria-label="Clear selection"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
