"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { syncContacts } from "@/features/marketing/marketing.actions";

/**
 * Adds accounts and booked customers, then pushes waiting changes to Resend.
 * Each call works for ~25 seconds; this keeps calling until nothing remains.
 */
export function SyncContactsButton({ pending }: { pending: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [remaining, setRemaining] = useState<number | null>(null);

  async function run() {
    setRemaining(pending);
    let pushed = 0;
    for (;;) {
      const result = await syncContacts();
      if (!result.success || !result.data) {
        toast({ title: "Sync stopped", description: result.error, variant: "destructive" });
        break;
      }
      pushed += result.data.pushed;
      setRemaining(result.data.remaining);
      if (result.data.error) {
        toast({ title: "Sync stopped", description: result.data.error, variant: "destructive" });
        break;
      }
      if (result.data.remaining === 0 || result.data.pushed === 0) {
        toast({ title: pushed > 0 ? `${pushed.toLocaleString()} contacts synced to Resend` : "Everything's in sync" });
        break;
      }
    }
    setRemaining(null);
    router.refresh();
  }

  return (
    <Button variant="glass" size="sm" className="h-9 gap-1.5 px-4" disabled={remaining !== null} onClick={() => void run()}>
      <RefreshCw className={remaining !== null ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {remaining !== null ? `Syncing… ${remaining.toLocaleString()} left` : "Sync to Resend"}
    </Button>
  );
}
