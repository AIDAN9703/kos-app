"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { authClient } from "@/shared/lib/auth/auth-client";
import { AuthCard } from "./AuthCard";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await authClient.requestPasswordReset({
      email: email.trim().toLowerCase(),
      redirectTo: "/reset-password",
    });
    setIsSubmitting(false);
    if (result.error?.status === 429) {
      setError("Too many requests. Please wait a few minutes and try again.");
      return;
    }
    // Same answer whether or not the email has an account.
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <p className="text-center text-sm text-gray-600">
          If <span className="font-medium text-foreground">{email}</span> has an account, we&apos;ve
          sent a link to choose a new password. It works for one hour.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="ml-1 text-sm font-medium text-gray-700">
            Email
          </Label>
          <Input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="h-10 text-sm"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2 h-11 w-full text-sm font-medium sm:h-10">
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
