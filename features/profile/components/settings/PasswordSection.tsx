"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { changePassword } from "../../actions/account.actions";

/**
 * Password row: change it, or set a first one for accounts that sign in with
 * Google or a texted code. Saving signs out every other device.
 */
export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const reset = () => {
    setForm({ currentPassword: "", newPassword: "", confirm: "" });
    setError(null);
    setFieldErrors({});
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4">
        <div>
          <p className="text-sm font-medium text-primary">Password</p>
          {hasPassword ? (
            <p className="mt-0.5 text-[15px] tracking-widest text-slate-800">••••••••</p>
          ) : (
            <p className="mt-0.5 text-[15px] text-slate-600">
              Not set. Add one to sign in with your email too.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setEditing(true);
          }}
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {hasPassword ? "Change" : "Set password"}
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setFieldErrors({ confirm: ["Passwords don't match"] });
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const result = await changePassword({
      currentPassword: hasPassword ? form.currentPassword : undefined,
      newPassword: form.newPassword,
    });
    setSaving(false);
    if (result.success) {
      setEditing(false);
      reset();
      toast({
        title: hasPassword ? "Password updated" : "Password set",
        description: hasPassword ? "Other devices have been signed out." : undefined,
      });
    } else {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    }
  };

  const field = (key: keyof typeof form, label: string, autoComplete: string) => {
    const err = fieldErrors[key]?.[0];
    const id = `password-${key}`;
    return (
      <div>
        <Label htmlFor={id} className="text-xs font-medium text-slate-600">
          {label}
        </Label>
        <Input
          id={id}
          type="password"
          autoComplete={autoComplete}
          value={form[key]}
          disabled={saving}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className={cn("mt-1 h-11 rounded-xl", err && "border-destructive")}
          aria-invalid={err ? true : undefined}
        />
        {err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="border-b border-gray-200 py-4">
      <p className="text-sm font-medium text-primary">{hasPassword ? "Change password" : "Set a password"}</p>
      <div className="mt-3 max-w-sm space-y-3">
        {hasPassword ? field("currentPassword", "Current password", "current-password") : null}
        {field("newPassword", "New password", "new-password")}
        {field("confirm", "Confirm new password", "new-password")}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.
      </p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={saving || (hasPassword && !form.currentPassword) || !form.newPassword}
        >
          {saving ? <Loader2 className="animate-spin" /> : null}
          {saving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
