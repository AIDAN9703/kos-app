"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { createOwnerAccountAction } from "../../owner-accounts.actions";
import { EMPTY_OWNER, OwnerForm, ownerInput, type OwnerFormValues } from "./OwnerForm";

/** Sets up a new owner; their page opens next, to move boats and invite them. */
export function NewOwnerButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<OwnerFormValues>(EMPTY_OWNER);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createOwnerAccountAction(ownerInput(values));
      if (!result.success || !result.data) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) {
          toast({ title: "That didn't work", description: result.error, variant: "destructive" });
        }
        return;
      }
      toast({ title: result.message ?? "Owner created" });
      setOpen(false);
      router.push(`/admin/owners/${result.data}`);
    });
  }

  return (
    <>
      <Button
        className="h-9 gap-1.5 rounded-full px-4 font-semibold"
        onClick={() => {
          setValues(EMPTY_OWNER);
          setErrors({});
          setOpen(true);
        }}
      >
        <Plus className="size-3.5" />
        New owner
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <form onSubmit={create} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>New owner</DialogTitle>
              <DialogDescription>
                Someone (or a business) whose boats KOS manages. Nobody needs a login yet: invite
                them once their boats are moved over.
              </DialogDescription>
            </DialogHeader>
            <OwnerForm values={values} onChange={setValues} errors={errors} />
            <DialogFooter>
              <Button
                type="button"
                variant="glass"
                className="border-0"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-full" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create owner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
