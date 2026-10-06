"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  promoteCrewFormSchema,
  type PromoteCrewFormInput,
} from "@/features/profiles/promote-crew.validation";
import { promoteUserToCrewAction } from "@/features/users/promote-user.actions";
import { useToast } from "@/shared/lib/hooks/use-toast";

interface PromoteToCrewModalProps {
  userId: string | null;
  displayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteToCrewModal({
  userId,
  displayName,
  open,
  onOpenChange,
}: PromoteToCrewModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<PromoteCrewFormInput>({
    resolver: zodResolver(promoteCrewFormSchema),
    defaultValues: { adminNotes: "" },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ adminNotes: "" });
    }
  }, [open, form]);

  async function onSubmit(data: PromoteCrewFormInput) {
    if (!userId) return;
    const res = await promoteUserToCrewAction(userId, data);
    if (res.success) {
      toast({ title: "Crew profile", description: res.message });
      onOpenChange(false);
      router.refresh();
    } else {
      toast({
        title: "Could not promote",
        description: res.error ?? "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to crew</DialogTitle>
          <DialogDescription>
            Add a crew profile for <span className="font-medium">{displayName}</span>. They can be
            assigned on bookings once their profile is <span className="font-medium">ACTIVE</span>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="adminNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      className="min-h-[88px]"
                      placeholder="Anything ops should know"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="destructive" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Create crew profile"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
