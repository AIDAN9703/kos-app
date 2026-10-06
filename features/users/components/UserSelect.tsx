"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, User, X } from "lucide-react";
import { useUsers, useUser } from "@/features/users/hooks/useUsers";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSelect({
  value,
  onChange,
  placeholder = "Select user or leave empty for guest",
  disabled,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: selectedUserData } = useUser(value || "");
  const selectedUser = selectedUserData || null;

  const { data: usersData, isLoading: loading } = useUsers(
    debouncedSearch.length >= 2 ? debouncedSearch : undefined
  );
  const users = usersData ?? [];

  const getDisplayName = (user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    username: string | null;
  }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email;
  };

  const handleSelectUser = (userId: string) => {
    onChange(userId);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
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
            {selectedUser ? (
              <div className="flex items-center gap-2 text-left">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={selectedUser.profileImage || undefined}
                    alt={getDisplayName(selectedUser)}
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <div className="font-medium">
                    {getDisplayName(selectedUser)}
                  </div>
                  {selectedUser.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedUser.email}
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
          className="admin-theme w-[400px] p-0 rounded-lg border-border bg-popover text-popover-foreground z-50"
          sideOffset={4}
        >
          <Command
            className="rounded-lg border-0"
            shouldFilter={false}
            filter={() => 1}
          >
            <CommandInput
              placeholder="Search users by name or email..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9 border-0"
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              {loading && (
                <CommandEmpty className="py-6 text-center text-sm">
                  Loading users...
                </CommandEmpty>
              )}
              {!loading && users.length === 0 && searchQuery.length < 2 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  Type at least 2 characters to search
                </CommandEmpty>
              )}
              {!loading && users.length === 0 && searchQuery.length >= 2 && (
                <CommandEmpty className="py-4 px-3">
                  <p className="text-center text-sm text-muted-foreground">
                    No users found for &quot;{searchQuery}&quot; — book them as a
                    guest instead.
                  </p>
                </CommandEmpty>
              )}
              {!loading && users.length > 0 && (
                <CommandGroup className="p-1">
                  {users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={getDisplayName(user)}
                      onSelect={() => handleSelectUser(user.id)}
                      className="cursor-pointer hover:bg-accent aria-selected:bg-accent px-2 py-2 rounded-md"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage
                            src={user.profileImage || undefined}
                            alt={getDisplayName(user)}
                          />
                          <AvatarFallback className="text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {getDisplayName(user)}
                          </div>
                          {user.email && (
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                          )}
                        </div>
                        {user.id === value && (
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

      {selectedUser && !disabled && (
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
