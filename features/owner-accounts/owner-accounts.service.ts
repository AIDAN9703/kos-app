import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/database/db";
import {
  boats,
  bookings,
  ownerAccountInvites,
  ownerAccountMembers,
  ownerAccounts,
  users,
} from "@/database/schema";
import { UserFacingError } from "@/shared/lib/errors";
import { INVITE_DAYS } from "./owner-accounts.constants";
import type {
  OwnerAccountDetail,
  OwnerAccountInvite,
  OwnerAccountMember,
  OwnerAccountOption,
  OwnerAccountRole,
  OwnerAccountRow,
  OwnerInvitePreview,
  OwnerMembership,
  OwnerPayoutSetup,
  OwnerTeam,
  MovableBoat,
} from "./owner-accounts.types";
import type { ownerAccountSchema } from "./owner-accounts.validation";
import type { z } from "zod";

type OwnerAccountValues = z.output<typeof ownerAccountSchema>;
type OwnerAccountPatch = Partial<Omit<typeof ownerAccounts.$inferInsert, "id" | "createdAt">>;

/** The payout side of an owner, as the portal and admin pages show it. */
export function payoutSetupFrom(row: {
  payoutMethod: "STRIPE" | "ZELLE" | null;
  zelleContact: string | null;
  stripeAccountId: string | null;
  stripePayoutsEnabled: boolean;
  stripeBankLast4: string | null;
}): OwnerPayoutSetup {
  return {
    payoutMethod: row.payoutMethod,
    zelleContact: row.zelleContact,
    stripeStarted: Boolean(row.stripeAccountId),
    stripeReady: Boolean(row.stripeAccountId) && row.stripePayoutsEnabled,
    stripeBankLast4: row.stripeBankLast4,
  };
}

/**
 * Owner accounts: who a boat belongs to and who KOS pays, and the people in
 * each. Not access-checked here: callers go through owner-accounts.data.ts
 * (or the owner portal and listing data files).
 */

const personName = (u: { firstName: string | null; lastName: string | null; email: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// ── Membership ──────────────────────────────────────────────────────────────

/** The owners a person belongs to; owner roles first, then A to Z. */
export async function membershipsForUser(userId: string): Promise<OwnerMembership[]> {
  const rows = await db
    .select({
      accountId: ownerAccounts.id,
      accountName: ownerAccounts.name,
      role: ownerAccountMembers.role,
    })
    .from(ownerAccountMembers)
    .innerJoin(ownerAccounts, eq(ownerAccounts.id, ownerAccountMembers.ownerAccountId))
    .where(eq(ownerAccountMembers.userId, userId))
    .orderBy(asc(ownerAccountMembers.role), asc(sql`lower(${ownerAccounts.name})`));
  return rows;
}

export async function hasMembership(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: ownerAccountMembers.id })
    .from(ownerAccountMembers)
    .where(eq(ownerAccountMembers.userId, userId))
    .limit(1);
  return Boolean(row);
}

/** WHERE clause: the boat belongs to an owner this person is in. */
export function boatOfMember(userId: string): SQL {
  return inArray(
    boats.ownerAccountId,
    db
      .select({ id: ownerAccountMembers.ownerAccountId })
      .from(ownerAccountMembers)
      .where(eq(ownerAccountMembers.userId, userId))
  );
}

/** WHERE clause on users: they belong to at least one owner. */
export function isOwnerMemberSql(): SQL {
  return sql`EXISTS (SELECT 1 FROM "owner_account_member" m WHERE m.user_id = "user"."id")`;
}

/**
 * The owner a person lists boats under: one they're an Owner of, or a new
 * one in their own name (the List your boat flow).
 */
export async function ensureAccountFor(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}): Promise<string> {
  const [existing] = await db
    .select({ id: ownerAccountMembers.ownerAccountId })
    .from(ownerAccountMembers)
    .where(and(eq(ownerAccountMembers.userId, user.id), eq(ownerAccountMembers.role, "OWNER")))
    .orderBy(asc(ownerAccountMembers.createdAt))
    .limit(1);
  if (existing) return existing.id;

  const [account] = await db
    .insert(ownerAccounts)
    .values({ name: user.name, contactEmail: user.email, contactPhone: user.phone })
    .returning({ id: ownerAccounts.id });
  await db
    .insert(ownerAccountMembers)
    .values({ ownerAccountId: account.id, userId: user.id, role: "OWNER" });
  return account.id;
}

// ── Accounts (admin) ────────────────────────────────────────────────────────

export async function listAccountOptions(): Promise<OwnerAccountOption[]> {
  return db
    .select({ id: ownerAccounts.id, name: ownerAccounts.name, isHouse: ownerAccounts.isHouse })
    .from(ownerAccounts)
    .orderBy(desc(ownerAccounts.isHouse), asc(sql`lower(${ownerAccounts.name})`));
}

export async function getHouseAccountId(): Promise<string> {
  const [house] = await db
    .select({ id: ownerAccounts.id })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.isHouse, true))
    .limit(1);
  if (!house) throw new Error("The KOS Yachts house account is missing (migration 0074).");
  return house.id;
}

/** Every owner with its boat and people counts: KOS Yachts first, then A to Z. */
export async function listAccountsForAdmin(): Promise<OwnerAccountRow[]> {
  const [accounts, boatCounts, memberCounts, inviteCounts] = await Promise.all([
    db
      .select({
        id: ownerAccounts.id,
        name: ownerAccounts.name,
        kind: ownerAccounts.kind,
        isHouse: ownerAccounts.isHouse,
      })
      .from(ownerAccounts)
      .orderBy(desc(ownerAccounts.isHouse), asc(sql`lower(${ownerAccounts.name})`)),
    db.select({ id: boats.ownerAccountId, n: count() }).from(boats).groupBy(boats.ownerAccountId),
    db
      .select({ id: ownerAccountMembers.ownerAccountId, n: count() })
      .from(ownerAccountMembers)
      .groupBy(ownerAccountMembers.ownerAccountId),
    db
      .select({ id: ownerAccountInvites.ownerAccountId, n: count() })
      .from(ownerAccountInvites)
      .where(
        and(isNull(ownerAccountInvites.acceptedAt), gt(ownerAccountInvites.expiresAt, new Date()))
      )
      .groupBy(ownerAccountInvites.ownerAccountId),
  ]);
  const toMap = (rows: { id: string | null; n: number }[]) => new Map(rows.map((r) => [r.id, r.n]));
  const boatsBy = toMap(boatCounts);
  const membersBy = toMap(memberCounts);
  const invitesBy = toMap(inviteCounts);
  return accounts.map((a) => {
    const memberCount = membersBy.get(a.id) ?? 0;
    return {
      ...a,
      boatCount: boatsBy.get(a.id) ?? 0,
      memberCount,
      status:
        memberCount > 0 ? "ACTIVE" : (invitesBy.get(a.id) ?? 0) > 0 ? "INVITED" : "NOT_INVITED",
    };
  });
}

async function teamFor(accountId: string): Promise<OwnerTeam> {
  const [members, invites] = await Promise.all([
    db
      .select({
        id: ownerAccountMembers.id,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: ownerAccountMembers.role,
        since: ownerAccountMembers.createdAt,
      })
      .from(ownerAccountMembers)
      .innerJoin(users, eq(users.id, ownerAccountMembers.userId))
      .where(eq(ownerAccountMembers.ownerAccountId, accountId))
      .orderBy(asc(ownerAccountMembers.role), asc(ownerAccountMembers.createdAt)),
    db
      .select({
        id: ownerAccountInvites.id,
        email: ownerAccountInvites.email,
        role: ownerAccountInvites.role,
        sentAt: ownerAccountInvites.createdAt,
        expiresAt: ownerAccountInvites.expiresAt,
      })
      .from(ownerAccountInvites)
      .where(
        and(
          eq(ownerAccountInvites.ownerAccountId, accountId),
          isNull(ownerAccountInvites.acceptedAt)
        )
      )
      .orderBy(desc(ownerAccountInvites.createdAt)),
  ]);
  return {
    members: members.map(
      (m): OwnerAccountMember => ({
        id: m.id,
        userId: m.userId,
        name: personName(m),
        email: m.email,
        role: m.role,
        since: m.since,
      })
    ),
    invites: invites satisfies OwnerAccountInvite[],
  };
}

export async function getTeam(accountId: string): Promise<OwnerTeam> {
  return teamFor(accountId);
}

export async function getAccountForAdmin(id: string): Promise<OwnerAccountDetail | null> {
  const [account] = await db.select().from(ownerAccounts).where(eq(ownerAccounts.id, id)).limit(1);
  if (!account) return null;
  const [boatRows, team] = await Promise.all([
    db
      .select({
        id: boats.id,
        name: boats.name,
        displayTitle: boats.displayTitle,
        active: boats.active,
        managedBy: boats.managedBy,
        listingStatus: boats.listingStatus,
        mainImage: boats.mainImage,
      })
      .from(boats)
      .where(eq(boats.ownerAccountId, id))
      .orderBy(asc(sql`lower(${boats.name})`)),
    teamFor(id),
  ]);
  return {
    id: account.id,
    name: account.name,
    kind: account.kind,
    isHouse: account.isHouse,
    contactEmail: account.contactEmail,
    contactPhone: account.contactPhone,
    ...payoutSetupFrom(account),
    adminNotes: account.adminNotes,
    createdAt: account.createdAt,
    boats: boatRows.map(({ displayTitle, name, ...b }) => ({ ...b, name: displayTitle || name })),
    ...team,
  };
}

export async function createAccount(input: OwnerAccountValues): Promise<string> {
  const [row] = await db
    .insert(ownerAccounts)
    .values({
      name: input.name,
      kind: input.kind,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      zelleContact: input.zelleContact ?? null,
      payoutMethod: input.zelleContact ? "ZELLE" : null,
      adminNotes: input.adminNotes ?? null,
    })
    .returning({ id: ownerAccounts.id });
  return row.id;
}

export async function updateAccount(id: string, patch: OwnerAccountPatch): Promise<void> {
  const updated = await db
    .update(ownerAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(ownerAccounts.id, id))
    .returning({ id: ownerAccounts.id });
  if (updated.length === 0) throw new UserFacingError("Owner not found", 404);
}

/** Only an owner with no boats can go; KOS Yachts never does. */
export async function deleteAccount(id: string): Promise<void> {
  const [account] = await db
    .select({ isHouse: ownerAccounts.isHouse })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.id, id));
  if (!account) throw new UserFacingError("Owner not found", 404);
  if (account.isHouse) throw new UserFacingError("KOS Yachts can't be deleted.");
  const [{ n }] = await db.select({ n: count() }).from(boats).where(eq(boats.ownerAccountId, id));
  if (n > 0) throw new UserFacingError("Move this owner's boats to another owner first.", 409);
  await db.delete(ownerAccounts).where(eq(ownerAccounts.id, id));
}

/**
 * Moves boats to another owner. With `moveHistory`, each boat's charters
 * that belonged to its old owner come along (the default when a boat leaves
 * KOS Yachts, which was only holding it). One batch, so it lands whole.
 */
export async function moveBoats(
  boatIds: string[],
  toAccountId: string,
  moveHistory: boolean
): Promise<void> {
  const [target] = await db
    .select({ id: ownerAccounts.id })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.id, toAccountId));
  if (!target) throw new UserFacingError("Owner not found", 404);

  const now = new Date();
  const steps: BatchItem<"pg">[] = [];
  if (moveHistory) {
    steps.push(
      db
        .update(bookings)
        .set({ ownerAccountId: toAccountId, updatedAt: now })
        .where(
          and(
            inArray(bookings.boatId, boatIds),
            sql`"booking"."owner_account_id" = (SELECT b.owner_account_id FROM "boat" b WHERE b.id = "booking"."boat_id")`
          )
        )
    );
  }
  steps.push(
    db
      .update(boats)
      .set({ ownerAccountId: toAccountId, updatedAt: now })
      .where(inArray(boats.id, boatIds))
  );
  await db.batch(steps as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}

/** Every boat with its current owner, for moving boats between owners. */
export async function listMovableBoats(): Promise<MovableBoat[]> {
  const rows = await db
    .select({
      id: boats.id,
      name: boats.name,
      displayTitle: boats.displayTitle,
      ownerAccountId: boats.ownerAccountId,
      ownerName: ownerAccounts.name,
    })
    .from(boats)
    .innerJoin(ownerAccounts, eq(ownerAccounts.id, boats.ownerAccountId))
    .orderBy(asc(sql`lower(${boats.name})`));
  return rows.map(({ displayTitle, name, ...b }) => ({ ...b, name: displayTitle || name }));
}

export async function getPayoutSetup(accountId: string): Promise<OwnerPayoutSetup> {
  const [row] = await db
    .select({
      payoutMethod: ownerAccounts.payoutMethod,
      zelleContact: ownerAccounts.zelleContact,
      stripeAccountId: ownerAccounts.stripeAccountId,
      stripePayoutsEnabled: ownerAccounts.stripePayoutsEnabled,
      stripeBankLast4: ownerAccounts.stripeBankLast4,
    })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.id, accountId));
  if (!row) throw new UserFacingError("Owner not found", 404);
  return payoutSetupFrom(row);
}

// ── People ──────────────────────────────────────────────────────────────────

async function ownerCount(accountId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(ownerAccountMembers)
    .where(
      and(eq(ownerAccountMembers.ownerAccountId, accountId), eq(ownerAccountMembers.role, "OWNER"))
    );
  return n;
}

async function memberIn(accountId: string, memberId: string) {
  const [member] = await db
    .select({
      id: ownerAccountMembers.id,
      role: ownerAccountMembers.role,
      userId: ownerAccountMembers.userId,
    })
    .from(ownerAccountMembers)
    .where(
      and(eq(ownerAccountMembers.id, memberId), eq(ownerAccountMembers.ownerAccountId, accountId))
    );
  if (!member) throw new UserFacingError("That person isn't in this owner.", 404);
  return member;
}

export async function setMemberRole(
  accountId: string,
  memberId: string,
  role: OwnerAccountRole
): Promise<void> {
  const member = await memberIn(accountId, memberId);
  if (member.role === "OWNER" && role !== "OWNER" && (await ownerCount(accountId)) <= 1) {
    throw new UserFacingError("Every owner needs at least one person with the Owner role.");
  }
  await db.update(ownerAccountMembers).set({ role }).where(eq(ownerAccountMembers.id, memberId));
}

/**
 * Takes someone out of an owner. The last person with the Owner role stays,
 * unless KOS removes them (`allowLastOwner`: the account then waits for a
 * new invite).
 */
export async function removeMember(
  accountId: string,
  memberId: string,
  { allowLastOwner }: { allowLastOwner: boolean }
): Promise<void> {
  const member = await memberIn(accountId, memberId);
  if (!allowLastOwner && member.role === "OWNER" && (await ownerCount(accountId)) <= 1) {
    throw new UserFacingError("You're the only Owner. Make someone else an Owner first.");
  }
  await db.delete(ownerAccountMembers).where(eq(ownerAccountMembers.id, memberId));
}

/**
 * Opens an invite and returns the token for the email link (stored only as
 * a hash). Inviting the same email again replaces the open invite.
 */
export async function createInvite(params: {
  accountId: string;
  email: string;
  role: OwnerAccountRole;
  invitedByUserId: string;
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const [already] = await db
    .select({ id: ownerAccountMembers.id })
    .from(ownerAccountMembers)
    .innerJoin(users, eq(users.id, ownerAccountMembers.userId))
    .where(
      and(
        eq(ownerAccountMembers.ownerAccountId, params.accountId),
        sql`lower(${users.email}) = ${email}`
      )
    )
    .limit(1);
  if (already) throw new UserFacingError("That person is already in this owner.", 409);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await db.batch([
    db
      .delete(ownerAccountInvites)
      .where(
        and(
          eq(ownerAccountInvites.ownerAccountId, params.accountId),
          eq(ownerAccountInvites.email, email),
          isNull(ownerAccountInvites.acceptedAt)
        )
      ),
    db.insert(ownerAccountInvites).values({
      ownerAccountId: params.accountId,
      email,
      role: params.role,
      tokenHash: hashToken(token),
      invitedByUserId: params.invitedByUserId,
      expiresAt,
    }),
  ]);
  return token;
}

/** An open invite, for sending it again. */
export async function getOpenInvite(accountId: string, inviteId: string) {
  const [invite] = await db
    .select({ email: ownerAccountInvites.email, role: ownerAccountInvites.role })
    .from(ownerAccountInvites)
    .where(
      and(
        eq(ownerAccountInvites.id, inviteId),
        eq(ownerAccountInvites.ownerAccountId, accountId),
        isNull(ownerAccountInvites.acceptedAt)
      )
    );
  if (!invite) throw new UserFacingError("That invite is gone.", 404);
  return invite;
}

export async function cancelInvite(accountId: string, inviteId: string): Promise<void> {
  await db
    .delete(ownerAccountInvites)
    .where(
      and(
        eq(ownerAccountInvites.id, inviteId),
        eq(ownerAccountInvites.ownerAccountId, accountId),
        isNull(ownerAccountInvites.acceptedAt)
      )
    );
}

export async function getAccountName(accountId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: ownerAccounts.name })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.id, accountId));
  return row?.name ?? null;
}

async function inviteByToken(token: string) {
  const [row] = await db
    .select({
      id: ownerAccountInvites.id,
      accountId: ownerAccountInvites.ownerAccountId,
      accountName: ownerAccounts.name,
      email: ownerAccountInvites.email,
      role: ownerAccountInvites.role,
      expiresAt: ownerAccountInvites.expiresAt,
      acceptedAt: ownerAccountInvites.acceptedAt,
      inviterFirstName: users.firstName,
      inviterLastName: users.lastName,
      inviterEmail: users.email,
    })
    .from(ownerAccountInvites)
    .innerJoin(ownerAccounts, eq(ownerAccounts.id, ownerAccountInvites.ownerAccountId))
    .leftJoin(users, eq(users.id, ownerAccountInvites.invitedByUserId))
    .where(eq(ownerAccountInvites.tokenHash, hashToken(token)))
    .limit(1);
  return row ?? null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}•••@${domain ?? ""}`;
}

export async function previewInvite(token: string): Promise<OwnerInvitePreview | null> {
  const invite = await inviteByToken(token);
  if (!invite) return null;
  return {
    accountName: invite.accountName,
    invitedBy: invite.inviterEmail
      ? personName({
          firstName: invite.inviterFirstName,
          lastName: invite.inviterLastName,
          email: invite.inviterEmail,
        })
      : null,
    role: invite.role,
    maskedEmail: maskEmail(invite.email),
    state: invite.acceptedAt ? "ACCEPTED" : invite.expiresAt < new Date() ? "EXPIRED" : "OPEN",
  };
}

/**
 * Joins the signed-in person to the owner. Needs a login with the invited
 * email; following the emailed link also confirms that email.
 */
export async function acceptInvite(
  token: string,
  user: { id: string; email: string }
): Promise<string> {
  const invite = await inviteByToken(token);
  if (!invite) throw new UserFacingError("This invite link isn't valid.", 404);
  if (invite.acceptedAt) throw new UserFacingError("This invite has already been used.", 409);
  if (invite.expiresAt < new Date()) {
    throw new UserFacingError("This invite has expired. Ask for a new one.", 409);
  }
  if (invite.email !== user.email.trim().toLowerCase()) {
    throw new UserFacingError(
      `This invite is for ${maskEmail(invite.email)}. Sign in with that email to accept it.`,
      403
    );
  }
  await db.batch([
    db
      .insert(ownerAccountMembers)
      .values({ ownerAccountId: invite.accountId, userId: user.id, role: invite.role })
      .onConflictDoNothing(),
    db
      .update(ownerAccountInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(ownerAccountInvites.id, invite.id)),
    db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id)),
  ]);
  return invite.accountId;
}

/** A person's owners with their boat counts, for their admin page. */
export async function membershipsWithBoats(
  userId: string
): Promise<(OwnerMembership & { boatCount: number })[]> {
  const memberships = await membershipsForUser(userId);
  if (memberships.length === 0) return [];
  const counts = await db
    .select({ id: boats.ownerAccountId, n: count() })
    .from(boats)
    .where(
      inArray(
        boats.ownerAccountId,
        memberships.map((m) => m.accountId)
      )
    )
    .groupBy(boats.ownerAccountId);
  const byId = new Map(counts.map((c) => [c.id, c.n]));
  return memberships.map((m) => ({ ...m, boatCount: byId.get(m.accountId) ?? 0 }));
}
