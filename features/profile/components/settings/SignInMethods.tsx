"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { authClient } from "@/shared/lib/auth/auth-client";
import { useToast } from "@/shared/lib/hooks/use-toast";

const actionClass =
  "text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50";

/** Google row: connect it as a second way in, or disconnect it. */
export function GoogleConnection({
  googleAccountId,
  canDisconnect,
}: {
  /** The Google sign-in method's id, or null when Google isn't connected. */
  googleAccountId: string | null;
  canDisconnect: boolean;
}) {
  const connected = googleAccountId !== null;
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/profile/settings#security",
    });
    if (error) {
      setBusy(false);
      toast({ title: "Couldn't connect Google", description: error.message, variant: "destructive" });
    }
    // Success leaves the page for Google and comes back here.
  };

  const disconnect = async () => {
    setBusy(true);
    if (!googleAccountId) return;
    const { error } = await authClient.unlinkAccount({ accountId: googleAccountId });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't disconnect Google", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Google disconnected" });
    router.refresh();
  };

  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4">
      <div className="flex items-start gap-3">
        <Image src="/icons/google.svg" alt="" width={18} height={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary">Google</p>
          <p className="mt-0.5 text-[15px] text-slate-600">
            {connected ? "Connected. You can sign in with Google." : "Not connected."}
          </p>
          {connected && !canDisconnect ? (
            <p className="mt-1 text-xs text-slate-500">
              Set a password before disconnecting, so you can still sign in.
            </p>
          ) : null}
        </div>
      </div>
      {busy ? (
        <Loader2 className="size-4 animate-spin text-slate-400" />
      ) : connected ? (
        canDisconnect ? (
          <button type="button" onClick={disconnect} className={actionClass}>
            Disconnect
          </button>
        ) : null
      ) : (
        <button type="button" onClick={connect} className={actionClass}>
          Connect
        </button>
      )}
    </div>
  );
}

/** Devices row: how many places this account is signed in, and a way to sign the others out. */
export function SignedInDevices({ count }: { count: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const others = Math.max(0, count - 1);

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await authClient.revokeOtherSessions();
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't sign out other devices", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed out of other devices" });
    router.refresh();
  };

  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-4">
      <div>
        <p className="text-sm font-medium text-primary">Devices</p>
        <p className="mt-0.5 text-[15px] text-slate-600">
          {others === 0
            ? "Signed in on this device only."
            : `Signed in here and on ${others} other device${others === 1 ? "" : "s"}.`}
        </p>
      </div>
      {others > 0 ? (
        busy ? (
          <Loader2 className="size-4 animate-spin text-slate-400" />
        ) : (
          <button type="button" onClick={signOutOthers} className={actionClass}>
            Sign out others
          </button>
        )
      ) : null}
    </div>
  );
}

/** "Unverified" badge on the email row with a button that sends the link. */
export function VerifyEmailButton({ email }: { email: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const send = async () => {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/profile/settings?verified=1",
    });
    if (error) {
      setState("idle");
      toast({
        title: "Couldn't send the link",
        description: error.status === 429 ? "Please wait a few minutes and try again." : error.message,
        variant: "destructive",
      });
      return;
    }
    setState("sent");
  };

  if (state === "sent") {
    return <span className="text-[11px] font-semibold text-slate-500">Link sent, check your inbox</span>;
  }
  return (
    <button
      type="button"
      onClick={send}
      disabled={state === "sending"}
      className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning hover:underline disabled:opacity-60"
    >
      {state === "sending" ? "Sending…" : "Unverified · Verify"}
    </button>
  );
}
