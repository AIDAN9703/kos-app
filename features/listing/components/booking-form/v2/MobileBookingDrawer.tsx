"use client";

import { useState } from "react";
import { CalendarCheck, ChevronUp } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { getBoatStartingHourlyLabel } from "@/shared/lib/utils/pricing-utils";
import { BoatWithTiers } from "@/features/boats/boat.types";
import { cn } from "@/shared/lib/utils/general-utils";

import { BookingForm } from "./BookingForm";
import type { BookingBoat } from "./useBookingForm";
import type { ServiceFee } from "@/shared/lib/utils/pricing-utils";

/**
 * Mobile booking entry point: a sticky price/CTA bar that opens a Vaul drawer
 * with the inline booking form. Restyled successor to `MobileBookingBar`.
 */
export function MobileBookingDrawer({
  boat,
  serviceFee,
}: {
  boat: BookingBoat;
  /** The card fee from app settings (rate + fixed), passed down from the server page. */
  serviceFee: ServiceFee;
}) {
  const [open, setOpen] = useState(false);
  const startingHourly = getBoatStartingHourlyLabel(boat as BoatWithTiers);

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 md:hidden",
          "border-t border-border bg-card/95 backdrop-blur-md",
          "shadow-[0_-10px_40px_-12px_rgba(15,23,42,0.18)]",
          "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
          open && "pointer-events-none translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Starting at
            </p>
            <p className="truncate text-lg font-bold leading-tight tracking-tight text-foreground">
              {startingHourly}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-12 shrink-0 gap-2 rounded-2xl px-6 text-base font-semibold shadow-md"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="boat-booking-drawer"
          >
            <CalendarCheck className="size-5 shrink-0" aria-hidden />
            Book now
            <ChevronUp className="size-4 shrink-0 opacity-80" aria-hidden />
          </Button>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        <DrawerContent
          id="boat-booking-drawer"
          className="flex max-h-[85dvh] flex-col gap-0 px-0 pb-[env(safe-area-inset-bottom)]"
        >
          <DrawerHeader className="shrink-0 gap-0 border-b border-border px-5 pb-4 pt-2 text-left">
            <DrawerTitle className="text-xl font-bold leading-tight tracking-tight text-foreground">
              Book your charter
            </DrawerTitle>
            <DrawerDescription className="text-base leading-tight text-muted-foreground">
              {boat.name}
            </DrawerDescription>
          </DrawerHeader>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 [-webkit-overflow-scrolling:touch]"
            role="region"
            aria-label="Booking form"
          >
            <BookingForm boat={boat} serviceFee={serviceFee} layout="inline" bare />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
