"use client";

import { useId, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { catalogKey, isOtherChoice, makeKey, OTHER_CHOICE } from "../boat-catalog.keys";
import type { CatalogMake } from "../boat-catalog.types";

/**
 * Who is picking decides what happens when a make or model isn't listed:
 * admins add it ("add"), owners choose "Other" ("other") and KOS fills it
 * in when reviewing the listing.
 */
export type CatalogPickerMode = "add" | "other";

/**
 * A searchable list (a "combobox"). Values are names; the server matches
 * them to the catalog when the boat is saved.
 */
function CatalogPicker({
  id,
  mode,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  heading,
  isListed,
  disabled,
  invalid,
  className,
}: {
  id?: string;
  mode: CatalogPickerMode;
  value: string;
  onChange: (value: string) => void;
  options: { key: string; label: string }[];
  placeholder: string;
  searchPlaceholder: string;
  heading: string;
  /** True when what's typed is already one of the options. */
  isListed: (typed: string) => boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();
  const typed = search.trim();

  function pick(next: string) {
    onChange(next);
    setSearch("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60",
            invalid && "border-destructive",
            className
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
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
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList className="max-h-72">
            <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
              {mode === "other" ? "Not listed. Choose Other below." : "Not listed."}
            </CommandEmpty>
            {mode === "add" && typed && !isListed(typed) ? (
              <CommandGroup>
                <CommandItem value={`__add__${typed}`} onSelect={() => pick(typed)}>
                  <Plus aria-hidden className="mr-2 size-4" />
                  Add &ldquo;{typed}&rdquo;
                </CommandItem>
              </CommandGroup>
            ) : null}
            {options.length > 0 ? (
              <CommandGroup heading={heading}>
                {options.map((option) => (
                  <CommandItem
                    key={option.key}
                    value={option.label}
                    onSelect={() => pick(option.label)}
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        "mr-2 size-4",
                        value === option.label ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {mode === "other" ? (
              <CommandGroup forceMount heading="Not listed?">
                <CommandItem forceMount value="__other__" onSelect={() => pick(OTHER_CHOICE)}>
                  <Check
                    aria-hidden
                    className={cn(
                      "mr-2 size-4",
                      isOtherChoice(value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Other
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function findMake(catalog: CatalogMake[], name: string): CatalogMake | undefined {
  const key = makeKey(name);
  return key ? catalog.find((m) => makeKey(m.name) === key) : undefined;
}

/** The model to keep when the make changes: none, or "Other" under "Other". */
export function modelForMake(make: string, previous: { make: string; model: string }): string {
  if (make === previous.make) return previous.model;
  return isOtherChoice(make) ? OTHER_CHOICE : "";
}

type PickerProps = {
  id?: string;
  mode: CatalogPickerMode;
  catalog: CatalogMake[];
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
};

export function MakePicker({ catalog, ...props }: PickerProps) {
  return (
    <CatalogPicker
      {...props}
      options={catalog.map((m) => ({ key: m.id, label: m.name }))}
      placeholder="Choose the make"
      searchPlaceholder={props.mode === "add" ? "Search or add a make…" : "Search makes…"}
      heading="Makes"
      isListed={(typed) => Boolean(findMake(catalog, typed))}
    />
  );
}

/** The models of the chosen make; until a make is chosen there's nothing to pick. */
export function ModelPicker({ catalog, make, ...props }: PickerProps & { make: string }) {
  const models = findMake(catalog, make)?.models ?? [];
  return (
    <CatalogPicker
      {...props}
      disabled={!make.trim() || isOtherChoice(make)}
      options={models.map((m) => ({ key: m.id, label: m.name }))}
      placeholder={make.trim() ? "Choose the model" : "Choose the make first"}
      searchPlaceholder={props.mode === "add" ? "Search or add a model…" : "Search models…"}
      heading="Models"
      isListed={(typed) => models.some((m) => catalogKey(m.name) === catalogKey(typed))}
    />
  );
}
