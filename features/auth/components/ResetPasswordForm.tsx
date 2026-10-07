"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Label } from "@/shared/components/ui/label";
import { authClient } from "@/shared/lib/auth/auth-client";
import { passwordSchema } from "@/shared/lib/validation/common";
import { toast } from "@/shared/lib/hooks/use-toast";
import { AuthCard } from "./AuthCard";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token || linkError) {
    return (
      <AuthCard title="This link has expired">
        <p className="text-center text-sm text-gray-600">
          Reset links work once, for one hour. Request a new one and use the latest email.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Send a new link
          </Link>
        </p>
      </AuthCard>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const checked = passwordSchema.safeParse(password);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setIsSubmitting(false);
    if (result.error) {
      setError(
        result.error.code === "INVALID_TOKEN"
          ? "This link has expired. Request a new one."
          : result.error.message || "Couldn't reset your password. Please try again."
      );
      return;
    }
    toast({ title: "Password updated", description: "Sign in with your new password." });
    router.push("/sign-in");
  };

  return (
    <AuthCard title="Choose a new password" subtitle="This signs you out on every other device.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password" className="ml-1 text-sm font-medium text-gray-700">
            New password
          </Label>
          <PasswordInput
            id="new-password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 text-sm"
          />
          <p className="ml-1 text-xs text-gray-500">
            At least 8 characters, with upper and lower case, a number and a symbol.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="ml-1 text-sm font-medium text-gray-700">
            Confirm new password
          </Label>
          <PasswordInput
            id="confirm-password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-10 text-sm"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2 h-11 w-full text-sm font-medium sm:h-10">
          {isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
