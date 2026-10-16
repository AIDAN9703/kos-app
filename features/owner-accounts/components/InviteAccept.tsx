"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AuthForm from "@/features/auth/components/AuthForm";
import { signInWithEmail, signUpWithEmail } from "@/features/auth/client/email-auth";
import { signInSchema, signUpSchema } from "@/features/_validation/validations";
import { Button } from "@/shared/components/ui/button";
import { acceptOwnerInviteAction } from "../owner-accounts.actions";

/** Signed out: make an account or sign in, then come back here. */
export function InviteSignIn({ token }: { token: string }) {
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
  const callbackUrl = `/owner-invite/${token}`;
  return mode === "sign-up" ? (
    <AuthForm
      key="invite-sign-up"
      type="SIGN_UP"
      schema={signUpSchema}
      defaultValues={{ email: "", firstName: "", lastName: "", phoneNumber: "", password: "" }}
      onSubmit={signUpWithEmail}
      embeddedCallbackUrl={callbackUrl}
      variant="embedded"
      hideHeading
      onSwitchToSignIn={() => setMode("sign-in")}
    />
  ) : (
    <AuthForm
      key="invite-sign-in"
      type="SIGN_IN"
      schema={signInSchema}
      defaultValues={{ email: "", password: "" }}
      onSubmit={signInWithEmail}
      embeddedCallbackUrl={callbackUrl}
      variant="embedded"
      hideHeading
      onSwitchToSignUp={() => setMode("sign-up")}
    />
  );
}

/** Signed in: join, then open the owner portal. */
export function InviteJoin({ token, accountName }: { token: string; accountName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-3">
      <Button
        size="lg"
        className="h-12 rounded-full px-8 text-base font-semibold"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptOwnerInviteAction(token);
            if (!result.success) {
              setError(result.error ?? "Couldn't accept the invite.");
              return;
            }
            router.push("/owner");
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Join {accountName}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
