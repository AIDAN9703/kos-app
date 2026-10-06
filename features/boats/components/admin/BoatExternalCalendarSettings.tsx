"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarPlus,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { toast } from "@/shared/lib/hooks/use-toast";
import {
  addExternalCalendar,
  removeExternalCalendar,
  setExternalCalendarEnabled,
  syncExternalCalendarNow,
} from "@/features/availability/actions/external-calendar.actions";
import type { ExternalCalendarListItem } from "@/features/availability/availability.types";

interface BoatExternalCalendarSettingsProps {
  boatId: string;
  calendars: ExternalCalendarListItem[];
}

function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SyncStatus({ cal }: { cal: ExternalCalendarListItem }) {
  if (!cal.syncEnabled) {
    return <span className="text-xs text-muted-foreground">Paused</span>;
  }
  if (cal.lastSyncStatus === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        Sync failed
      </span>
    );
  }
  if (cal.lastSyncStatus === "SUCCESS") {
    const count = cal.lastEventCount ?? 0;
    return (
      <span className="text-xs font-medium text-success">
        {count} block{count === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

export function BoatExternalCalendarSettings({
  boatId,
  calendars,
}: BoatExternalCalendarSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isAdding, startAdd] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const showAddForm = calendars.length === 0 || addFormOpen;

  function handleAdd() {
    if (!name.trim() || !url.trim()) {
      toast({
        title: "Missing details",
        description: "Add a name and the iCal URL.",
        variant: "destructive",
      });
      return;
    }
    startAdd(async () => {
      const result = await addExternalCalendar(boatId, { name, icalUrl: url });
      if (result.success) {
        toast({
          title: "Calendar connected",
          description: result.error
            ? result.error
            : `Imported ${result.data?.eventCount ?? 0} busy block(s).`,
          variant: result.error ? "destructive" : undefined,
        });
        setName("");
        setUrl("");
        setAddFormOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Could not connect calendar",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  async function runAction(
    id: string,
    fn: () => Promise<{ success: boolean; error?: string; data?: { eventCount?: number } }>,
    successTitle: string,
    successDescription?: (eventCount?: number) => string
  ) {
    setBusyId(id);
    try {
      const result = await fn();
      if (result.success) {
        toast({
          title: successTitle,
          description: successDescription?.(result.data?.eventCount),
        });
        router.refresh();
      } else {
        toast({
          title: "Something went wrong",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      {calendars.length > 0 && (
        <ul className="space-y-2">
          {calendars.map((cal) => {
            const isBusy = busyId === cal.id;
            return (
              <li
                key={cal.id}
                className="overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{cal.name}</span>
                      <SyncStatus cal={cal} />
                    </div>
                    <p
                      className="mt-1 truncate font-mono text-[11px] text-muted-foreground"
                      title={cal.icalUrl}
                    >
                      {cal.icalUrl}
                    </p>
                    {cal.lastSyncStatus === "ERROR" && cal.lastSyncError ? (
                      <p className="mt-1 line-clamp-2 text-xs text-destructive">
                        {cal.lastSyncError}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last synced {timeAgo(cal.lastSyncedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={cal.syncEnabled}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        runAction(
                          cal.id,
                          () => setExternalCalendarEnabled(cal.id, checked),
                          checked ? "Sync resumed" : "Sync paused"
                        )
                      }
                      aria-label="Toggle sync"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy || !cal.syncEnabled}
                      className="gap-1.5"
                      onClick={() =>
                        runAction(
                          cal.id,
                          () => syncExternalCalendarNow(cal.id),
                          "Synced",
                          (count) => `Imported ${count ?? 0} busy block(s).`
                        )
                      }
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove "${cal.name}"? Its imported blocks will be deleted.`
                          )
                        ) {
                          runAction(
                            cal.id,
                            () => removeExternalCalendar(cal.id),
                            "Calendar removed"
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {calendars.length > 0 && !showAddForm ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setAddFormOpen(true)}
        >
          <CalendarPlus className="h-4 w-4" />
          Add another calendar
        </Button>
      ) : (
        <div className="min-w-0 space-y-2 rounded-lg border border-dashed border-border/70 p-3">
          {calendars.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Add another calendar</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setAddFormOpen(false);
                  setName("");
                  setUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <Label htmlFor="ext-cal-name" className="text-xs">
              Name
            </Label>
            <Input
              id="ext-cal-name"
              placeholder="Owner Google Calendar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 min-w-0"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="ext-cal-url" className="text-xs">
              iCal URL
            </Label>
            <Input
              id="ext-cal-url"
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-9 min-w-0 font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="h-9 w-full gap-1.5 sm:w-auto"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {calendars.length === 0 ? "Connect" : "Add calendar"}
          </Button>
        </div>
      )}
    </div>
  );
}
