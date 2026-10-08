"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/lib/hooks/use-toast";
import {
  assignAdminToBooking,
  cancelBooking,
  markBookingBooked,
  markBookingCompleted,
} from "@/features/bookings/actions/deal.actions";
import { markDealLost, toggleDealArchived } from "@/features/bookings/actions/deal.actions";

interface DealAdminOption {
  id: string;
  name: string;
}

interface DealActionsMenuProps {
  bookingId: string;
  bookingStatus: string;
  isArchived?: boolean;
  assignedAdminId?: string | null;
  admins?: DealAdminOption[];
  /** Admins choose who a deal is assigned to; brokers don't see the menu. */
  canAssign?: boolean;
  /** Current admin's user id — powers "Assign to me". */
  currentUserId?: string | null;
}

/**
 * The quiet header overflow (⋯) — ownership and lifecycle verbs that don't
 * deserve their own button: assign, mark booked, complete, archive,
 * lost/cancel. The
 * everyday verbs live on the cards they belong to (Activity, Payments).
 */
export function DealActionsMenu({
  bookingId,
  bookingStatus,
  isArchived = false,
  assignedAdminId = null,
  admins = [],
  canAssign = true,
  currentUserId = null,
}: DealActionsMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [openDialog, setOpenDialog] = useState<"lost" | "cancel" | null>(null);
  const [dialogText, setDialogText] = useState("");

  const isInquiry = bookingStatus === "INQUIRY";
  const isSettled = bookingStatus === "COMPLETED" || bookingStatus === "CANCELLED";

  function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setOpenDialog(null);
        setDialogText("");
        if (result.message) toast({ title: result.message });
        router.refresh();
      } else {
        toast({ title: "Action failed", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="glass"
            size="sm"
            aria-label="More actions"
            className="size-9 shrink-0 p-0"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {!isSettled && canAssign ? (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Assign
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {currentUserId && assignedAdminId !== currentUserId ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => run(() => assignAdminToBooking(bookingId, currentUserId))}
                        className="cursor-pointer"
                      >
                        Assign to me
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  {admins.length === 0 ? (
                    <DropdownMenuItem disabled>No admins available</DropdownMenuItem>
                  ) : (
                    admins.map((admin) => (
                      <DropdownMenuItem
                        key={admin.id}
                        disabled={admin.id === assignedAdminId}
                        onClick={() => run(() => assignAdminToBooking(bookingId, admin.id))}
                        className="cursor-pointer"
                      >
                        {admin.name}
                        {admin.id === assignedAdminId ? (
                          <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
                        ) : null}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {bookingStatus === "PROPOSED" ? (
            /* "They said yes on the phone" — locks the date without a click
               from the customer. Money is recorded separately. */
            <DropdownMenuItem
              onClick={() => run(() => markBookingBooked(bookingId))}
              className="cursor-pointer gap-2"
            >
              <CalendarCheck className="h-4 w-4" />
              Mark as booked
            </DropdownMenuItem>
          ) : null}

          {bookingStatus === "BOOKED" ? (
            <DropdownMenuItem
              onClick={() => run(() => markBookingCompleted(bookingId))}
              className="cursor-pointer gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark charter completed
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            onClick={() => run(() => toggleDealArchived(bookingId))}
            className="cursor-pointer gap-2"
          >
            <Archive className="h-4 w-4" />
            {isArchived ? "Restore from archive" : "Archive"}
          </DropdownMenuItem>
          {isInquiry ? (
            <DropdownMenuItem
              onClick={() => setOpenDialog("lost")}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4" />
              Mark lost
            </DropdownMenuItem>
          ) : bookingStatus !== "CANCELLED" ? (
            <DropdownMenuItem
              onClick={() => setOpenDialog("cancel")}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4" />
              Cancel booking
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mark lost / cancel — same dialog shape, different verb */}
      <Dialog
        open={openDialog === "lost" || openDialog === "cancel"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{openDialog === "lost" ? "Mark deal lost" : "Cancel booking"}</DialogTitle>
            <DialogDescription>
              {openDialog === "lost"
                ? "Closes the deal as lost — it moves to the archive bucket."
                : "Closes the booking and frees the calendar. Refunds are handled on the payments card."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={dialogText}
              onChange={(e) => setDialogText(e.target.value)}
              placeholder={openDialog === "lost" ? "Why was it lost?" : "Why is it cancelled?"}
              rows={2}
              className="mt-2 resize-none rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} className="rounded-xl">
              Keep deal
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                run(() =>
                  openDialog === "lost"
                    ? markDealLost(bookingId, dialogText)
                    : cancelBooking(bookingId, dialogText)
                )
              }
              disabled={isPending || !dialogText.trim()}
              className="rounded-xl gap-2"
            >
              {isPending ? "Working…" : openDialog === "lost" ? "Mark lost" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
