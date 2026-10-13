"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { setListingLiveAction } from "../listing.actions";

/** Hide an approved listing from the site, or show it again. */
export function ListingVisibilityButton({ boatId, live }: { boatId: string; live: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setListingLiveAction(boatId, !live);
      if (!result.success) {
        toast({
          title: "Couldn't update the listing",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: live ? "Hidden from kosyachts.com" : "Live on kosyachts.com" });
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="glass"
      onClick={toggle}
      disabled={pending}
      className="h-10 rounded-full px-5"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {live ? "Hide listing" : "Show listing"}
    </Button>
  );
}
