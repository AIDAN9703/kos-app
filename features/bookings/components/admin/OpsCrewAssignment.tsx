"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, UserPlus, X } from "lucide-react";
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
import {
  addBookingCrewMember,
  removeBookingCrewMember,
} from "@/features/bookings/actions/deal.actions";
import { useToast } from "@/shared/lib/hooks/use-toast";

export type CrewAssignmentMember = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
};

export type CrewAssignmentOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

function formatCrewName(c: { firstName: string | null; lastName: string | null; email: string }) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "Unknown";
}

interface OpsCrewAssignmentProps {
  bookingId: string;
  assignedCrew: CrewAssignmentMember[];
  crewOptions: CrewAssignmentOption[];
}

export function OpsCrewAssignment({
  bookingId,
  assignedCrew,
  crewOptions,
}: OpsCrewAssignmentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const assignedUserIds = new Set(assignedCrew.map((c) => c.userId));
  const addable = crewOptions.filter((c) => !assignedUserIds.has(c.id));

  async function add(userId: string) {
    setPending(true);
    try {
      const res = await addBookingCrewMember(bookingId, userId, null);
      if (res.success) {
        setModalOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Could not add crew",
          description: res.error ?? "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setPending(false);
    }
  }

  async function remove(bookingCrewId: string) {
    setPending(true);
    try {
      const res = await removeBookingCrewMember(bookingId, bookingCrewId);
      if (res.success) {
        router.refresh();
      } else {
        toast({
          title: "Could not remove crew",
          description: res.error ?? "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setPending(false);
    }
  }

  // Label ("Crew") is owned by the parent card — this renders person chips
  // (one per member, X to remove) plus a dashed add pill, mirroring
  // OpsCaptainAssignment so the two sections read as one system.
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {assignedCrew.map((m) => (
          <span
            key={m.id}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/30 py-1 pl-1 pr-1"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-foreground">
              {adminInitials(formatCrewName(m)) || "?"}
            </span>
            <Link
              href={`/admin/users/${m.userId}`}
              className="min-w-0 truncate text-xs font-medium underline-offset-4 hover:text-primary-strong hover:underline"
              title={formatCrewName(m)}
            >
              {formatCrewName(m)}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
              disabled={pending}
              aria-label={`Remove ${formatCrewName(m)}`}
              onClick={() => remove(m.id)}
            >
              <X className="h-3 w-3" aria-hidden />
            </Button>
          </span>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden />
          )}
          {assignedCrew.length === 0 ? "Add crew" : null}
        </button>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!pending) setModalOpen(open);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add crew</DialogTitle>
            <DialogDescription>
              Assign additional crew for this charter. Only users with an active crew profile are
              listed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {addable.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="outline"
                className="h-auto w-full justify-start rounded-xl py-2 text-left font-normal"
                disabled={pending}
                onClick={() => add(c.id)}
              >
                {/* Button lays children out as a flex ROW — without this column
                    wrapper the email sits beside the name and starves it. */}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{formatCrewName(c)}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {c.email}
                  </span>
                </span>
              </Button>
            ))}
            {addable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {crewOptions.length === 0
                  ? "No active crew yet. Create a user and enable their crew profile so they appear here."
                  : "Everyone listed is already assigned. Remove someone first or add more crew profiles."}
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
                Add crew (new user)
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Opens user creation in a new tab. Enable the crew profile, then refresh this page.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
