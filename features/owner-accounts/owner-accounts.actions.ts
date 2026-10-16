"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/shared/lib/utils/action-helpers";
import type { ActionResponse } from "@/shared/lib/types/types";
import * as ownersData from "./owner-accounts.data";
import * as payoutsData from "./owner-payouts.data";

/** Owner changes show on the owner pages, the boats list and the owner portal. */
function refresh() {
  revalidatePath("/admin/owners", "layout");
  revalidatePath("/admin/boats", "layout");
  revalidatePath("/owner", "layout");
}

async function run<T>(
  work: () => Promise<T>,
  fallback: string,
  message?: string | ((result: T) => string)
): Promise<ActionResponse<T>> {
  try {
    const data = await work();
    refresh();
    return {
      success: true,
      data,
      message: typeof message === "function" ? message(data) : message,
    };
  } catch (error) {
    return actionError(error, fallback);
  }
}

const inviteMessage = (sent: boolean) =>
  sent ? "Invite sent." : "Invite saved, but the email didn't send. Try Resend.";

// ── Admin ───────────────────────────────────────────────────────────────────

export async function createOwnerAccountAction(input: unknown) {
  return run(
    () => ownersData.createOwnerAccount(input),
    "Couldn't create the owner.",
    "Owner created."
  );
}

export async function updateOwnerAccountAction(accountId: string, input: unknown) {
  return run(
    () => ownersData.updateOwnerAccount(accountId, input),
    "Couldn't save the owner.",
    "Saved."
  );
}

export async function deleteOwnerAccountAction(accountId: string) {
  return run(
    () => ownersData.deleteOwnerAccount(accountId),
    "Couldn't delete the owner.",
    "Owner deleted."
  );
}

export async function moveBoatsToOwnerAction(accountId: string, input: unknown) {
  return run(
    () => ownersData.moveBoatsToOwner(accountId, input),
    "Couldn't move the boats.",
    "Moved."
  );
}

export async function inviteToOwnerAction(accountId: string, input: unknown) {
  return run(
    () => ownersData.inviteToOwner(accountId, input),
    "Couldn't send the invite.",
    inviteMessage
  );
}

export async function resendOwnerInviteAction(accountId: string, inviteId: string) {
  return run(
    () => ownersData.resendOwnerInvite(accountId, inviteId),
    "Couldn't resend the invite.",
    inviteMessage
  );
}

export async function cancelOwnerInviteAction(accountId: string, inviteId: string) {
  return run(
    () => ownersData.cancelOwnerInvite(accountId, inviteId),
    "Couldn't cancel the invite.",
    "Invite cancelled."
  );
}

export async function setOwnerMemberRoleAction(accountId: string, memberId: string, role: string) {
  return run(
    () => ownersData.setOwnerMemberRole(accountId, memberId, role),
    "Couldn't change the role.",
    "Role changed."
  );
}

export async function removeOwnerMemberAction(accountId: string, memberId: string) {
  return run(
    () => ownersData.removeOwnerMember(accountId, memberId),
    "Couldn't remove them.",
    "Removed."
  );
}

// ── Owner portal ────────────────────────────────────────────────────────────

export async function switchMyOwnerAction(accountId: string) {
  return run(() => ownersData.switchMyOwner(accountId), "Couldn't switch owners.");
}

export async function inviteToMyOwnerAction(input: unknown) {
  return run(() => ownersData.inviteToMyOwner(input), "Couldn't send the invite.", inviteMessage);
}

export async function resendMyInviteAction(inviteId: string) {
  return run(
    () => ownersData.resendMyInvite(inviteId),
    "Couldn't resend the invite.",
    inviteMessage
  );
}

export async function cancelMyInviteAction(inviteId: string) {
  return run(
    () => ownersData.cancelMyInvite(inviteId),
    "Couldn't cancel the invite.",
    "Invite cancelled."
  );
}

export async function setMyMemberRoleAction(memberId: string, role: string) {
  return run(
    () => ownersData.setMyMemberRole(memberId, role),
    "Couldn't change the role.",
    "Role changed."
  );
}

export async function removeMyMemberAction(memberId: string) {
  return run(() => ownersData.removeMyMember(memberId), "Couldn't remove them.", "Removed.");
}

// ── How owners are paid (owner portal) ─────────────────────────────────────

/** Returns the Stripe page to send them to. */
export async function startMyDirectDepositAction() {
  return run(() => payoutsData.startMyDirectDeposit(), "Couldn't open direct deposit setup.");
}

export async function openMyStripeDashboardAction() {
  return run(() => payoutsData.openMyStripeDashboard(), "Couldn't open your Stripe dashboard.");
}

export async function saveMyZelleAction(input: unknown) {
  return run(() => payoutsData.saveMyZelle(input), "Couldn't save your Zelle.", "Saved.");
}

export async function chooseMyPayoutMethodAction(method: string) {
  return run(
    () => payoutsData.chooseMyPayoutMethod(method),
    "Couldn't change how you're paid.",
    "Saved."
  );
}

// ── Paying owners (admin) ───────────────────────────────────────────────────

const dollars = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export async function payOwnerByDirectDepositAction(accountId: string, bookingId: string) {
  return run(
    () => payoutsData.payOwnerByDirectDeposit(accountId, bookingId),
    "Couldn't send the payout.",
    (cents) => `${dollars(cents)} sent by direct deposit.`
  );
}

export async function recordOwnerZellePayoutAction(accountId: string, input: unknown) {
  return run(
    () => payoutsData.recordOwnerZellePayout(accountId, input),
    "Couldn't record the payout.",
    "Zelle payout recorded."
  );
}

export async function removeOwnerZellePayoutAction(accountId: string, payoutId: string) {
  return run(
    () => payoutsData.removeOwnerZellePayout(accountId, payoutId),
    "Couldn't remove the payout.",
    "Removed."
  );
}

export async function refreshOwnerDirectDepositAction(accountId: string) {
  return run(
    () => payoutsData.refreshOwnerDirectDeposit(accountId),
    "Couldn't check with Stripe.",
    (setup) =>
      setup.stripeReady ? "Direct deposit is ready." : "Stripe still needs details from them."
  );
}

// ── Invites ─────────────────────────────────────────────────────────────────

export async function acceptOwnerInviteAction(token: string) {
  return run(
    () => ownersData.acceptOwnerInvite(token),
    "Couldn't accept the invite.",
    "You're in."
  );
}
