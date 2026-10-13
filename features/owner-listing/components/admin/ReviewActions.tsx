"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { approveListingAction, sendListingBackAction } from "../../listing.actions";

/** Approve (goes live) or send back with a note the owner sees on every step. */
export function ReviewActions({ boatId }: { boatId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "send-back">("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return setError(result.error);
      toast({ title: result.message ?? "Done" });
      router.push("/admin/boats/review");
      router.refresh();
    });
  }

  if (mode === "send-back") {
    return (
      <div className="space-y-3">
        <Textarea
          autoFocus
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What should the owner change? e.g. Add photos of the cabin and helm; the 4-hour price looks low for a 60 ft."
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => run(() => sendListingBackAction(boatId, note))}
            disabled={pending}
            className="rounded-full"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send back to owner
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode("idle")}
            disabled={pending}
            className="rounded-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => run(() => approveListingAction(boatId))}
          disabled={pending}
          className="rounded-full"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Approve and publish
        </Button>
        <Button
          variant="glass"
          onClick={() => setMode("send-back")}
          disabled={pending}
          className="border-0"
        >
          Ask for changes
        </Button>
      </div>
    </div>
  );
}
