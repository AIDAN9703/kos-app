"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Plus, UserPlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { adminInitials } from "@/shared/lib/utils/people-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { assignCaptainToBooking } from "@/features/bookings/actions/deal.actions";
import { useToast } from "@/shared/lib/hooks/use-toast";

export type CaptainAssignmentOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

function formatCaptainName(c: CaptainAssignmentOption): string {
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "Unknown";
}

function displayAssigned(
  captainUserId: string | null,
  captainFirstName: string | null,
  captainLastName: string | null,
  captainEmail: string | null,
  captainOptions: CaptainAssignmentOption[]
): CaptainAssignmentOption | null {
  if (!captainUserId) return null;
  const fromList = captainOptions.find((c) => c.id === captainUserId);
  if (fromList) return fromList;
  return {
    id: captainUserId,
    firstName: captainFirstName,
    lastName: captainLastName,
    email: captainEmail ?? "",
  };
}

/** Dashed pill for the empty state — same affordance as OpsCrewAssignment. */
const assignPillClass =
  "inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground";

interface OpsCaptainAssignmentProps {
  bookingId: string;
  captainUserId: string | null;
  captainFirstName: string | null;
  captainLastName: string | null;
  captainEmail: string | null;
  captainOptions: CaptainAssignmentOption[];
}

export function OpsCaptainAssignment({
  bookingId,
  captainUserId,
  captainFirstName,
  captainLastName,
  captainEmail,
  captainOptions,
}: OpsCaptainAssignmentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const assigned = displayAssigned(
    captainUserId,
    captainFirstName,
    captainLastName,
    captainEmail,
    captainOptions
  );

  async function apply(next: string | null) {
    setPending(true);
    try {
      const res = await assignCaptainToBooking(bookingId, next);
      if (res.success) {
        setModalOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Could not update captain",
          description: res.error ?? "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setPending(false);
    }
  }

  const assignDialog = (
    <Dialog
      open={modalOpen}
      onOpenChange={(open) => {
        if (!pending) setModalOpen(open);
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign captain</DialogTitle>
          <DialogDescription>
            Choose who is running this charter. Only users with an active captain profile are
            listed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          {captainUserId ? (
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full justify-start rounded-xl py-2 text-left font-normal"
              disabled={pending}
              onClick={() => apply(null)}
            >
              Clear assignment (unassigned)
            </Button>
          ) : null}
          {captainOptions.map((c) => (
            <Button
              key={c.id}
              type="button"
              variant={captainUserId === c.id ? "secondary" : "outline"}
              className="h-auto w-full justify-start rounded-xl py-2 text-left font-normal"
              disabled={pending}
              onClick={() => apply(c.id)}
            >
              {/* Button lays children out as a flex ROW — without this column
                  wrapper the email sits beside the name and starves it. */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{formatCaptainName(c)}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {c.email}
                </span>
              </span>
            </Button>
          ))}
          {captainOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active captains yet. Use the button below to create a user, then set up their
              captain profile so they appear here.
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 rounded-xl"
            disabled={pending}
            asChild
          >
            <Link href="/admin/users?newUser=true" target="_blank" rel="noopener noreferrer">
              <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
              Add captain (new user)
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Opens user creation in a new tab. After they have an active captain profile, refresh
            this page to assign them.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Label ("Captain") is owned by the parent card — this renders only the
  // person chip, or the dashed assign pill when nobody's on the wheel yet.
  return (
    <>
      {assigned ? (
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/30 py-1 pl-1 pr-1">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-foreground">
            {adminInitials(formatCaptainName(assigned)) || "?"}
          </span>
          <Link
            href={`/admin/users/${assigned.id}`}
            className="min-w-0 truncate text-xs font-medium underline-offset-4 hover:text-primary-strong hover:underline"
            title={formatCaptainName(assigned)}
          >
            {formatCaptainName(assigned)}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            disabled={pending}
            aria-label="Change captain"
            onClick={() => setModalOpen(true)}
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Pencil className="h-3 w-3" aria-hidden />
            )}
          </Button>
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setModalOpen(true)}
          className={assignPillClass}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden />
          )}
          Assign captain
        </button>
      )}

      {assignDialog}
    </>
  );
}
