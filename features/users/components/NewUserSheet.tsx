"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { createUser } from "@/features/users/user.actions";
import type { AssignableRole } from "@/features/users/user-roles.constants";
import { userSearchParams } from "@/features/users/searchParams";
import { RoleToggles } from "./RoleToggles";

const EMPTY = { firstName: "", lastName: "", email: "", phoneNumber: "" };
type TextField = keyof typeof EMPTY;

/**
 * Add a person from the right-hand sheet (?newUser=true). They get an email
 * to choose their password; the list refreshes with them at the top.
 */
export function NewUserSheet() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useQueryState("newUser", userSearchParams.newUser);
  const [values, setValues] = useState(EMPTY);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const reset = () => {
    setValues(EMPTY);
    setRoles([]);
    setError(null);
    setFieldErrors({});
  };
  const close = () => {
    void setOpen(null);
    reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const result = await createUser({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phoneNumber: values.phoneNumber.trim() || null,
      roles,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't create the user.");
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    toast({ title: "User created", description: result.message });
    close();
    router.refresh();
  };

  const field = (key: TextField, label: string, props: React.ComponentProps<typeof Input> = {}) => {
    const message = fieldErrors[key]?.[0];
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`new-user-${key}`} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <Input
          id={`new-user-${key}`}
          value={values[key]}
          onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          aria-invalid={message ? true : undefined}
          className={cn(message && "border-destructive")}
          disabled={saving}
          {...props}
        />
        {message ? <p className="text-xs text-destructive">{message}</p> : null}
      </div>
    );
  };

  return (
    <Sheet open={open === true} onOpenChange={(next) => (next ? void setOpen(true) : close())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle>Add user</SheetTitle>
          <SheetDescription>They&apos;ll get an email to choose their password.</SheetDescription>
        </SheetHeader>

        <form id="new-user-form" onSubmit={submit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("firstName", "First name", { required: true, autoComplete: "off", autoFocus: true })}
            {field("lastName", "Last name", { required: true, autoComplete: "off" })}
          </div>
          {field("email", "Email", { type: "email", required: true, autoComplete: "off" })}
          {field("phoneNumber", "Phone (optional)", { type: "tel", autoComplete: "off", placeholder: "+1 305 555 0123" })}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">Access</legend>
            <p className="text-xs text-muted-foreground">Leave all off for a customer.</p>
            <div className="pt-1">
              <RoleToggles value={roles} onChange={setRoles} disabled={saving} />
            </div>
          </fieldset>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-user-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? "Creating…" : "Create user"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
