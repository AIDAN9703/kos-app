import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/shared/lib/utils/auth-utils";
import { previewOwnerInvite } from "@/features/owner-accounts/owner-accounts.data";
import { OWNER_ROLE_LABELS } from "@/features/owner-accounts/owner-accounts.constants";
import { InviteJoin, InviteSignIn } from "@/features/owner-accounts/components/InviteAccept";

export const metadata: Metadata = {
  title: "Owner invite",
  robots: { index: false, follow: false },
};

/**
 * Where an owner invite email lands. Anyone with the link sees who invited
 * them to what; joining needs a login with the invited email.
 */
export default async function OwnerInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, session] = await Promise.all([previewOwnerInvite(token), getSession()]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-14 sm:px-8 sm:py-20">
      {!invite ? (
        <Message title="This invite link isn't valid">
          It may have been cancelled, or the link was cut off. Ask whoever invited you to send a new
          one.
        </Message>
      ) : invite.state === "ACCEPTED" ? (
        <Message title="This invite has been used">
          If it was yours,{" "}
          <Link href="/owner" className="font-semibold text-primary underline">
            open the owner portal
          </Link>
          .
        </Message>
      ) : invite.state === "EXPIRED" ? (
        <Message title="This invite has expired">
          Ask {invite.invitedBy ?? "KOS"} to send a new one.
        </Message>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
              Owner portal invite
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-primary text-balance">
              Join {invite.accountName} on KOS Yachts
            </h1>
            <p className="text-[15px] leading-7 text-slate-600">
              {invite.invitedBy ? `${invite.invitedBy} invited you` : "You're invited"} as{" "}
              {invite.role === "OWNER" ? "an Owner" : "a Manager"}.{" "}
              {OWNER_ROLE_LABELS[invite.role].description} The invite is for{" "}
              <span className="font-semibold text-primary">{invite.maskedEmail}</span>.
            </p>
          </div>
          {session ? (
            <InviteJoin token={token} accountName={invite.accountName} />
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-slate-600">
                Create an account (or sign in) with that email, and you&apos;ll come right back
                here.
              </p>
              <InviteSignIn token={token} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
      <p className="text-[15px] leading-7 text-slate-600">{children}</p>
    </div>
  );
}
