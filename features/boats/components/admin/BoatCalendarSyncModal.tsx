"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { BoatExternalCalendarSettings } from "@/features/boats/components/admin/BoatExternalCalendarSettings";
import type { ExternalCalendarListItem } from "@/features/availability/availability.types";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";

interface BoatCalendarSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boatId: string;
  calendars: ExternalCalendarListItem[];
  feedUrl: string | null;
  feedError: string | null;
}

function IcalExportSection({
  feedUrl,
  feedError,
}: {
  feedUrl: string | null;
  feedError: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (feedError) {
    return (
      <p className="text-sm text-warning">{feedError}</p>
    );
  }

  if (!feedUrl) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Input
        readOnly
        value={feedUrl}
        className="h-9 min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
        onFocus={(e) => e.target.select()}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}

export function BoatCalendarSyncModal({
  open,
  onOpenChange,
  boatId,
  calendars,
  feedUrl,
  feedError,
}: BoatCalendarSyncModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calendar sync</DialogTitle>
          <DialogDescription>
            Import Google busy times to block booking, or export KOS bookings to Google.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5 pt-1">
          <section className="min-w-0 space-y-2">
            <h3 className="text-sm font-medium">Import — block busy times</h3>
            <p className="text-xs text-muted-foreground">
              Google Calendar → Settings → your calendar → Secret iCal address. Paste below.
            </p>
            <BoatExternalCalendarSettings boatId={boatId} calendars={calendars} />
          </section>

          <Separator />

          <section className="min-w-0 space-y-2">
            <h3 className="text-sm font-medium">Export — show KOS bookings (optional)</h3>
            <p className="text-xs text-muted-foreground">
              Google Calendar → Add calendar → From URL. Paste this link.
            </p>
            <IcalExportSection feedUrl={feedUrl} feedError={feedError} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
