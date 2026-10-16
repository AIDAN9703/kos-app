"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { setListingMarkupAction } from "../../listing.actions";
import { DEFAULT_MARKUP_PERCENT, MARKUP_LIMITS } from "../../listing.constants";

/** KOS's markup on this boat's owner rates; applying it re-prices every trip. */
export function MarkupControl({
  boatId,
  markupPercent,
}: {
  boatId: string;
  markupPercent: number | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const current = markupPercent ?? DEFAULT_MARKUP_PERCENT;
  const [value, setValue] = useState(String(current));
  const changed = Number(value) !== current || markupPercent === null;

  function apply() {
    startTransition(async () => {
      const result = await setListingMarkupAction(boatId, Number(value));
      toast(
        result.success
          ? { title: result.message ?? "Saved" }
          : { title: "That didn't work", description: result.error, variant: "destructive" }
      );
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="listing-markup" className="text-sm text-muted-foreground">
        KOS markup
      </label>
      <div className="relative w-20">
        <Input
          id="listing-markup"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 2))}
          className="pr-6 text-right tabular-nums"
          aria-describedby="listing-markup-help"
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
      <Button
        variant="glass"
        className="h-9 border-0 px-4"
        disabled={pending || !changed || value === ""}
        onClick={apply}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {markupPercent === null && Number(value) === current ? "Confirm" : "Apply"}
      </Button>
      <p id="listing-markup-help" className="w-full text-xs text-muted-foreground">
        Guests pay the owner&apos;s rate plus this, rounded up to $5 ({MARKUP_LIMITS.min}–
        {MARKUP_LIMITS.max}%).
        {markupPercent === null
          ? ` Not set yet, so the default ${DEFAULT_MARKUP_PERCENT}% applies.`
          : ""}
      </p>
    </div>
  );
}
