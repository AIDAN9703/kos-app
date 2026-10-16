import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import type { ZodTypeAny, z } from "zod";
import { AccessDenied, invalidFieldsFrom, UserFacingError } from "@/shared/lib/errors";
import { sendAccountEmail } from "@/shared/lib/services/email.service";
import { assertCan, assertSignedIn, type SessionUser } from "@/shared/lib/utils/auth-utils";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { isUuid } from "@/shared/lib/utils/general-utils";
import { INVITE_DAYS, OWNER_ACCOUNT_COOKIE, OWNER_ROLE_LABELS } from "./owner-accounts.constants";
import * as accountsService from "./owner-accounts.service";
import type {
  OwnerAccountDetail,
  OwnerAccountOption,
  OwnerAccountRole,
  OwnerAccountRow,
  OwnerInvitePreview,
  OwnerMembership,
  OwnerTeam,
  MovableBoat,
} from "./owner-accounts.types";
import {
  inviteSchema,
  moveBoatsSchema,
  ownerAccountSchema,
  ownerRoleSchema,
} from "./owner-accounts.validation";

/**
 * Owners (owner accounts). KOS staff who edit boats manage every owner; in
 * the owner portal, people manage their own owner, and only its Owners
 * invite people, change roles or see how it's paid.
 */

function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw invalidFieldsFrom(result.error);
  return result.data;
}

function id(value: string, what: string): string {
  if (!isUuid(value)) throw new UserFacingError(`${what} not found`, 404);
  return value;
}

/** The portal opens on this owner next time. */
async function rememberOwner(accountId: string): Promise<void> {
  (await cookies()).set(OWNER_ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

const fullName = (u: SessionUser) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email;

/** Emails an invite. False when the email couldn't be sent (the invite stays open). */
async function sendInvite(params: {
  accountId: string;
  email: string;
  role: OwnerAccountRole;
  inviter: SessionUser;
  /** Staff inviting on KOS's behalf; an owner inviting their team otherwise. */
  fromKos: boolean;
}): Promise<boolean> {
  const token = await accountsService.createInvite({
    accountId: params.accountId,
    email: params.email,
    role: params.role,
    invitedByUserId: params.inviter.id,
  });
  const accountName = (await accountsService.getAccountName(params.accountId)) ?? "your boats";
  const who = params.fromKos ? "KOS Yachts" : fullName(params.inviter);
  const what =
    params.role === "OWNER"
      ? "You'll see the boats, calendar, charters and earnings, and can invite your own team."
      : "You'll see the boats, calendar and charters.";
  return sendAccountEmail({
    to: params.email,
    subject: `You're invited to ${accountName} on KOS Yachts`,
    previewText: `${who} added you as ${OWNER_ROLE_LABELS[params.role].label.toLowerCase()} of ${accountName}.`,
    lead: `${who} added you as ${params.role === "OWNER" ? "an owner" : "a manager"} of ${accountName} in the KOS owner portal. ${what}`,
    buttonLabel: "Accept invite",
    url: `${getBaseUrl()}/owner-invite/${token}`,
    footnote: `This link works for ${INVITE_DAYS} days, with this email address only. If you weren't expecting it, you can ignore this email.`,
  });
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function listOwnerAccounts(): Promise<OwnerAccountRow[]> {
  await assertCan({ boat: ["edit"] });
  return accountsService.listAccountsForAdmin();
}

export async function listOwnerAccountOptions(): Promise<OwnerAccountOption[]> {
  await assertCan({ boat: ["edit"] });
  return accountsService.listAccountOptions();
}

export async function getOwnerAccount(accountId: string): Promise<OwnerAccountDetail | null> {
  await assertCan({ boat: ["edit"] });
  return isUuid(accountId) ? accountsService.getAccountForAdmin(accountId) : null;
}

export async function createOwnerAccount(input: unknown): Promise<string> {
  await assertCan({ boat: ["edit"] });
  return accountsService.createAccount(parse(ownerAccountSchema, input));
}

export async function updateOwnerAccount(accountId: string, input: unknown): Promise<void> {
  await assertCan({ boat: ["edit"] });
  await accountsService.updateAccount(id(accountId, "Owner"), parse(ownerAccountSchema, input));
}

export async function deleteOwnerAccount(accountId: string): Promise<void> {
  await assertCan({ boat: ["edit"] });
  await accountsService.deleteAccount(id(accountId, "Owner"));
}

export async function listMovableBoats(): Promise<MovableBoat[]> {
  await assertCan({ boat: ["edit"] });
  return accountsService.listMovableBoats();
}

export async function moveBoatsToOwner(accountId: string, input: unknown): Promise<void> {
  await assertCan({ boat: ["edit"] });
  const { boatIds, moveHistory } = parse(moveBoatsSchema, input);
  await accountsService.moveBoats(boatIds, id(accountId, "Owner"), moveHistory);
}

export async function inviteToOwner(accountId: string, input: unknown): Promise<boolean> {
  const me = await assertCan({ boat: ["edit"] });
  const { email, role } = parse(inviteSchema, input);
  return sendInvite({ accountId: id(accountId, "Owner"), email, role, inviter: me, fromKos: true });
}

export async function resendOwnerInvite(accountId: string, inviteId: string): Promise<boolean> {
  const me = await assertCan({ boat: ["edit"] });
  const invite = await accountsService.getOpenInvite(
    id(accountId, "Owner"),
    id(inviteId, "Invite")
  );
  return sendInvite({ accountId, ...invite, inviter: me, fromKos: true });
}

export async function cancelOwnerInvite(accountId: string, inviteId: string): Promise<void> {
  await assertCan({ boat: ["edit"] });
  await accountsService.cancelInvite(id(accountId, "Owner"), id(inviteId, "Invite"));
}

export async function setOwnerMemberRole(accountId: string, memberId: string, role: unknown) {
  await assertCan({ boat: ["edit"] });
  await accountsService.setMemberRole(
    id(accountId, "Owner"),
    id(memberId, "Person"),
    parse(ownerRoleSchema, role)
  );
}

export async function removeOwnerMember(accountId: string, memberId: string): Promise<void> {
  await assertCan({ boat: ["edit"] });
  await accountsService.removeMember(id(accountId, "Owner"), id(memberId, "Person"), {
    allowLastOwner: true,
  });
}

/** A person's owners, for their admin page. */
export async function listOwnersForUser(userId: string) {
  await assertCan({ boat: ["edit"] });
  return isUuid(userId) ? accountsService.membershipsWithBoats(userId) : [];
}

// ── Owner portal ────────────────────────────────────────────────────────────

export interface OwnerContext {
  user: SessionUser;
  /** The owner being looked at. */
  current: OwnerMembership;
  memberships: OwnerMembership[];
  /** Owners see earnings and payout details; managers don't. */
  canSeeMoney: boolean;
}

/** Who's signed in, and which of their owners they're looking at (once per request). */
export const getMyOwnerContext = cache(async (): Promise<OwnerContext> => {
  const user = await assertSignedIn();
  const memberships = await accountsService.membershipsForUser(user.id);
  if (memberships.length === 0) throw new AccessDenied();
  const chosen = (await cookies()).get(OWNER_ACCOUNT_COOKIE)?.value;
  const current = memberships.find((m) => m.accountId === chosen) ?? memberships[0];
  return { user, current, memberships, canSeeMoney: current.role === "OWNER" };
});

/** The signed-in person, with the Owner role in the owner they're looking at. */
export async function assertMyOwnerRole(): Promise<OwnerContext> {
  const context = await getMyOwnerContext();
  if (context.current.role !== "OWNER") throw new AccessDenied();
  return context;
}

/** Switches the owner the portal shows (for people in more than one). */
export async function switchMyOwner(accountId: string): Promise<void> {
  const user = await assertSignedIn();
  const memberships = await accountsService.membershipsForUser(user.id);
  if (!memberships.some((m) => m.accountId === accountId)) throw new AccessDenied();
  await rememberOwner(accountId);
}

export async function getMyTeam(): Promise<OwnerTeam> {
  const { current } = await getMyOwnerContext();
  return accountsService.getTeam(current.accountId);
}

export async function inviteToMyOwner(input: unknown): Promise<boolean> {
  const { user, current } = await assertMyOwnerRole();
  const { email, role } = parse(inviteSchema, input);
  return sendInvite({ accountId: current.accountId, email, role, inviter: user, fromKos: false });
}

export async function resendMyInvite(inviteId: string): Promise<boolean> {
  const { user, current } = await assertMyOwnerRole();
  const invite = await accountsService.getOpenInvite(current.accountId, id(inviteId, "Invite"));
  return sendInvite({ accountId: current.accountId, ...invite, inviter: user, fromKos: false });
}

export async function cancelMyInvite(inviteId: string): Promise<void> {
  const { current } = await assertMyOwnerRole();
  await accountsService.cancelInvite(current.accountId, id(inviteId, "Invite"));
}

export async function setMyMemberRole(memberId: string, role: unknown): Promise<void> {
  const { current } = await assertMyOwnerRole();
  await accountsService.setMemberRole(
    current.accountId,
    id(memberId, "Person"),
    parse(ownerRoleSchema, role)
  );
}

export async function removeMyMember(memberId: string): Promise<void> {
  const { current } = await assertMyOwnerRole();
  await accountsService.removeMember(current.accountId, id(memberId, "Person"), {
    allowLastOwner: false,
  });
}

// ── Invites ─────────────────────────────────────────────────────────────────

/** What the invite page shows; anyone with the link may see it. */
export async function previewOwnerInvite(token: string): Promise<OwnerInvitePreview | null> {
  return token.length >= 20 ? accountsService.previewInvite(token) : null;
}

export async function acceptOwnerInvite(token: string): Promise<void> {
  const me = await assertSignedIn("Sign in to accept the invite");
  // The portal opens on the owner they just joined.
  await rememberOwner(await accountsService.acceptInvite(token, me));
}
