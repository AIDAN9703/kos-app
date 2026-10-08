"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { createCampaign } from "@/features/marketing/marketing.actions";

/** Starts a draft campaign and opens it. */
export function NewCampaignButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      className="h-9 gap-1.5 rounded-full px-4 font-semibold"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await createCampaign();
        if (result.success && result.data) router.push(`/admin/marketing/${result.data.id}`);
        else {
          setBusy(false);
          toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        }
      }}
    >
      <Plus className="h-3.5 w-3.5" />
      New campaign
    </Button>
  );
}
