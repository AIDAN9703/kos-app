"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor, KeyRound, Loader2, MoreHorizontal, Trash2, UserCheck, UserX, UsersRound } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useToast } from "@/shared/lib/hooks/use-toast";
import type { ActionResponse } from "@/shared/lib/types/types";
import type { CaptainStatus, CrewStatus } from "@/database/types";
import { canPromoteToCaptain, canPromoteToCrew } from "@/features/profiles/promote-eligibility";
import { PromoteToCaptainModal } from "@/features/profiles/components/PromoteToCaptainModal";
import { PromoteToCrewModal } from "@/features/profiles/components/PromoteToCrewModal";
import { deleteUser, sendUserPasswordEmail, setUserDeactivated } from "@/features/users/user.actions";

interface UserActionsMenuProps {
  userId: string;
  name: string;
  hasPassword: boolean;
  deactivated: boolean;
  canDelete: boolean;
  /** Your own account: no deactivate or delete. */
  isSelf: boolean;
  captainStatus: CaptainStatus | null;
  crewStatus: CrewStatus | null;
}

type Confirming = "deactivate" | "delete" | null;

/** The person's account actions: password email, promotions, deactivate, delete. */
export function UserActionsMenu({
  userId,
  name,
  hasPassword,
  deactivated,
  canDelete,
  isSelf,
  captainStatus,
  crewStatus,
}: UserActionsMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [promoting, setPromoting] = useState<"captain" | "crew" | null>(null);

  const run = async (work: () => Promise<ActionResponse<null>>, after?: () => void) => {
    setBusy(true);
    const result = await work();
    setBusy(false);
    setConfirming(null);
    if (result.success) {
      toast({ title: result.message ?? "Done" });
      after?.();
    } else {
      toast({ title: "That didn't work", description: result.error, variant: "destructive" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="glass" size="icon" className="size-9" aria-label="Account actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={() => void run(() => sendUserPasswordEmail(userId))} disabled={busy}>
            <KeyRound className="size-4" />
            {hasPassword ? "Send password reset email" : "Resend set-password email"}
          </DropdownMenuItem>
          {canPromoteToCaptain(captainStatus) ? (
            <DropdownMenuItem onSelect={() => setPromoting("captain")}>
              <Anchor className="size-4" />
              Make a captain
            </DropdownMenuItem>
          ) : null}
          {canPromoteToCrew(crewStatus) ? (
            <DropdownMenuItem onSelect={() => setPromoting("crew")}>
              <UsersRound className="size-4" />
              Make crew
            </DropdownMenuItem>
          ) : null}
          {isSelf ? null : <DropdownMenuSeparator />}
          {isSelf ? null : deactivated ? (
            <DropdownMenuItem onSelect={() => void run(() => setUserDeactivated(userId, false))} disabled={busy}>
              <UserCheck className="size-4" />
              Reactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirming("deactivate")} className="text-destructive">
              <UserX className="size-4" />
              Deactivate
            </DropdownMenuItem>
          )}
          {canDelete && !isSelf ? (
            <DropdownMenuItem onSelect={() => setConfirming("delete")} className="text-destructive">
              <Trash2 className="size-4" />
              Delete permanently
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && !busy && setConfirming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirming === "delete" ? `Delete ${name}?` : `Deactivate ${name}?`}</DialogTitle>
            <DialogDescription>
              {confirming === "delete"
                ? "Their account is removed for good. They have no bookings or history, so nothing else is affected."
                : "They're signed out everywhere and can't sign in. Their bookings and history stay, and you can reactivate them any time."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                confirming === "delete"
                  ? void run(() => deleteUser(userId), () => router.replace("/admin/users"))
                  : void run(() => setUserDeactivated(userId, true))
              }
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {confirming === "delete" ? "Delete" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PromoteToCaptainModal
        userId={promoting === "captain" ? userId : null}
        displayName={name}
        open={promoting === "captain"}
        onOpenChange={(open) => !open && setPromoting(null)}
      />
      <PromoteToCrewModal
        userId={promoting === "crew" ? userId : null}
        displayName={name}
        open={promoting === "crew"}
        onOpenChange={(open) => !open && setPromoting(null)}
      />
    </>
  );
}
