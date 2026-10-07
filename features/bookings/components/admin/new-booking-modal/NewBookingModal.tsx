"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/general-utils";
import { BookingComposer } from "@/features/bookings/components/admin/booking-forms/BookingComposer";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";

/**
 * "Add booking" trigger + dialog for the board header and dashboard — a thin
 * shell around the one BookingComposer every creation door shares. Multi-boat
 * charter parties, financials capture, and proposal sending all live in the
 * composer itself.
 */
export function NewBookingModal({
  pricingTiers,
  triggerLabel = "Add booking",
  triggerClassName,
  triggerSize = "sm",
  defaultOpen = false,
  onCloseComplete,
  canLinkAccounts = false,
}: {
  pricingTiers: PricingTierOption[];
  triggerLabel?: string;
  triggerClassName?: string;
  triggerSize?: "sm" | "default" | "lg";
  defaultOpen?: boolean;
  onCloseComplete?: () => void;
  /** Offer "Existing account" (admins; the account picker needs the user list). */
  canLinkAccounts?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  // ?newBooking=true deep link: when the prop flips true after mount (nuqs
  // hydration / client nav), open — adjusted during render, no effect needed.
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen);
    if (defaultOpen) setOpen(true);
  }

  const handleClose = () => {
    setOpen(false);
    onCloseComplete?.();
  };

  return (
    <>
      <Button
        size={triggerSize}
        className={cn(triggerSize === "sm" && "h-9 gap-1.5", triggerClassName)}
        onClick={() => setOpen(true)}
      >
        <Plus className={cn(triggerSize === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
            <DialogDescription>
              One or more boats — add a second boat to create a charter party. Optionally send
              the proposal on create.
            </DialogDescription>
          </DialogHeader>
          <BookingComposer
            pricingTiers={pricingTiers}
            canLinkAccounts={canLinkAccounts}
            onSuccess={() => {
              handleClose();
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
