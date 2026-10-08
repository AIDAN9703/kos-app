"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Phone } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { addDealNote, logDealContact } from "@/features/bookings/actions/deal.actions";

const CONTACT_METHODS = [
  { value: "PHONE", label: "Phone" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "IN_PERSON", label: "In person" },
  { value: "OTHER", label: "Other" },
] as const;

/**
 * The two feed-writing verbs, living where the feed lives — small buttons in
 * the Activity card header (extracted from the old quick-actions dropdown).
 */
export function ActivityComposer({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [openDialog, setOpenDialog] = useState<"contact" | "note" | null>(null);
  const [contactMethod, setContactMethod] =
    useState<(typeof CONTACT_METHODS)[number]["value"]>("PHONE");
  const [dialogText, setDialogText] = useState("");

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

  const triggerClass = "h-8 gap-1.5 px-3 text-xs";

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="glass" size="sm" className={triggerClass} onClick={() => setOpenDialog("contact")}>
          <Phone className="h-3.5 w-3.5" />
          Log contact
        </Button>
        <Button variant="glass" size="sm" className={triggerClass} onClick={() => setOpenDialog("note")}>
          <FileText className="h-3.5 w-3.5" />
          Note
        </Button>
      </div>

      {/* Log contact */}
      <Dialog open={openDialog === "contact"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Log contact</DialogTitle>
            <DialogDescription>
              The first logged contact moves the deal to Contacted on the pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Method</Label>
              <Select
                value={contactMethod}
                onValueChange={(v) => setContactMethod(v as typeof contactMethod)}
              >
                <SelectTrigger className="mt-2 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={dialogText}
                onChange={(e) => setDialogText(e.target.value)}
                placeholder="What was discussed?"
                rows={2}
                className="mt-2 resize-none rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => run(() => logDealContact(bookingId, contactMethod, dialogText))}
              disabled={isPending}
              className="rounded-xl"
            >
              {isPending ? "Logging…" : "Log contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add note */}
      <Dialog open={openDialog === "note"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={dialogText}
            onChange={(e) => setDialogText(e.target.value)}
            placeholder="Internal note — visible to staff only"
            rows={3}
            className="resize-none rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => run(() => addDealNote(bookingId, dialogText))}
              disabled={isPending || !dialogText.trim()}
              className="rounded-xl"
            >
              {isPending ? "Saving…" : "Add note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
