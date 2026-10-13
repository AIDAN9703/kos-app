"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { saveListingStepAction } from "../listing.actions";
import { listingStepHref, stepAfter, type ListingStepId } from "../listing.constants";
import type { EditableStep } from "../listing.validation";

/**
 * Saves one step. While a listing is being built, a save moves on to the
 * next step; on a live listing it stays put and says "Saved".
 */
export function useStepSave(boatId: string, step: EditableStep, advance: boolean) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();
  const [formError, setFormError] = useState<string>();

  function save(values: unknown, next: ListingStepId = stepAfter(step)) {
    startTransition(async () => {
      const result = await saveListingStepAction(boatId, step, values);
      if (!result.success) {
        setFieldErrors(result.fieldErrors);
        setFormError(result.fieldErrors ? undefined : result.error);
        return;
      }
      setFieldErrors(undefined);
      setFormError(undefined);
      if (advance) {
        router.push(listingStepHref(boatId, next));
      } else {
        toast({ title: "Saved" });
        router.refresh();
      }
    });
  }

  return { save, pending, fieldErrors, formError };
}
