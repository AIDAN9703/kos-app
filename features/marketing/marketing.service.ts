import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/database/db";
import { marketingCampaigns, marketingContacts } from "@/database/schema";
import type { ImportedContact } from "@/features/marketing/lib/contact-import";
import {
  AUDIENCE_ALL,
  type Campaign,
  type CampaignListItem,
  type ContactSummary,
  type MarketingContactRow,
} from "@/features/marketing/marketing.types";

/**
 * Marketing contacts and campaigns. Queries only; the data layer checks
 * access. A contact row is the team's copy; `synced_at` null marks a change
 * that still has to reach Resend.
 */

/* ── Contacts ───────────────────────────────────────────────────────── */

type ContactFilter = "subscribed" | "unsubscribed" | "pending";

export async function listContacts(params: {
  search?: string;
  source?: string;
  filter?: ContactFilter;
  page: number;
  limit: number;
}): Promise<{ contacts: MarketingContactRow[]; totalCount: number }> {
  const where = and(
    params.search
      ? or(
          ilike(marketingContacts.email, `%${params.search}%`),
          ilike(sql`coalesce(${marketingContacts.firstName}, '') || ' ' || coalesce(${marketingContacts.lastName}, '')`, `%${params.search}%`)
        )
      : undefined,
    params.source ? eq(marketingContacts.source, params.source) : undefined,
    params.filter === "subscribed" ? isNull(marketingContacts.unsubscribedAt) : undefined,
    params.filter === "unsubscribed" ? isNotNull(marketingContacts.unsubscribedAt) : undefined,
    params.filter === "pending" ? isNull(marketingContacts.syncedAt) : undefined
  );
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(marketingContacts)
      .where(where)
      .orderBy(desc(marketingContacts.createdAt), asc(marketingContacts.email))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit),
    db.select({ n: count() }).from(marketingContacts).where(where),
  ]);
  return {
    contacts: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: [r.firstName, r.lastName].filter(Boolean).join(" ") || null,
      source: r.source,
      subscribed: r.unsubscribedAt === null,
      synced: r.syncedAt !== null,
      createdAt: r.createdAt,
    })),
    totalCount: Number(total?.n ?? 0),
  };
}

export async function getContactSummary(): Promise<ContactSummary> {
  const [[totals], sources] = await Promise.all([
    db
      .select({
        total: count(),
        subscribed: sql<number>`count(*) FILTER (WHERE ${marketingContacts.unsubscribedAt} IS NULL)::int`,
        pending: sql<number>`count(*) FILTER (WHERE ${marketingContacts.syncedAt} IS NULL)::int`,
      })
      .from(marketingContacts),
    db
      .select({ source: marketingContacts.source, subscribed: count() })
      .from(marketingContacts)
      .where(isNull(marketingContacts.unsubscribedAt))
      .groupBy(marketingContacts.source)
      .orderBy(desc(count())),
  ]);
  const total = Number(totals?.total ?? 0);
  const subscribed = Number(totals?.subscribed ?? 0);
  return {
    total,
    subscribed,
    unsubscribed: total - subscribed,
    pending: Number(totals?.pending ?? 0),
    sources: sources.map((s) => ({ source: s.source, subscribed: Number(s.subscribed) })),
  };
}

/** Which of these addresses are already on the list. */
export async function findExistingEmails(emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 1000) {
    const chunk = emails.slice(i, i + 1000);
    const rows = await db
      .select({ email: marketingContacts.email })
      .from(marketingContacts)
      .where(inArray(marketingContacts.email, chunk));
    rows.forEach((r) => found.add(r.email));
  }
  return found;
}

/** Add contacts under a source; addresses already on the list are left as they are. */
export async function insertContacts(contacts: ImportedContact[], source: string): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < contacts.length; i += 500) {
    const rows = await db
      .insert(marketingContacts)
      .values(contacts.slice(i, i + 500).map((c) => ({ ...c, source })))
      .onConflictDoNothing({ target: marketingContacts.email })
      .returning({ id: marketingContacts.id });
    inserted += rows.length;
  }
  return inserted;
}

/**
 * Bring accounts and booked customers onto the list. Accounts with marketing
 * on are added (and linked when their address is already here); accounts
 * that turned it off are unsubscribed. Customers from booked or completed
 * trips are added once, even without an account.
 */
export async function refreshAutomaticContacts(testAddressesOnly: boolean): Promise<void> {
  const pattern = testAddressesOnly ? "%@resend.dev" : "%@%";
  await db.execute(sql`
    INSERT INTO marketing_contact (email, first_name, last_name, source, user_id)
    SELECT lower(trim(u.email)), u.first_name, u.last_name, 'Accounts', u.id
    FROM "user" u
    WHERE u.marketing_emails_enabled AND NOT coalesce(u.banned, false) AND u.email LIKE ${pattern}
    ON CONFLICT (email) DO NOTHING`);
  await db.execute(sql`
    UPDATE marketing_contact c SET user_id = u.id
    FROM "user" u
    WHERE c.user_id IS NULL AND c.email = lower(trim(u.email))`);
  await db.execute(sql`
    UPDATE marketing_contact c SET unsubscribed_at = now(), synced_at = NULL, updated_at = now()
    FROM "user" u
    WHERE c.user_id = u.id AND NOT u.marketing_emails_enabled AND c.unsubscribed_at IS NULL`);
  await db.execute(sql`
    INSERT INTO marketing_contact (email, first_name, last_name, source)
    SELECT DISTINCT ON (lower(trim(b.customer_email)))
      lower(trim(b.customer_email)),
      nullif(split_part(trim(b.customer_name), ' ', 1), ''),
      nullif(trim(substr(trim(b.customer_name), length(split_part(trim(b.customer_name), ' ', 1)) + 1)), ''),
      'Bookings'
    FROM booking b
    WHERE b.booking_status IN ('BOOKED', 'COMPLETED') AND b.customer_email LIKE ${pattern}
    ON CONFLICT (email) DO NOTHING`);
}

/** A person turned marketing on or off in their account settings. */
export async function setUserMarketing(userId: string, enabled: boolean): Promise<void> {
  await db
    .update(marketingContacts)
    .set({ unsubscribedAt: enabled ? null : new Date(), syncedAt: null, updatedAt: new Date() })
    .where(eq(marketingContacts.userId, userId));
}

/** The team unsubscribes someone (they asked by phone or email). */
export async function unsubscribeContact(id: string): Promise<{ userId: string | null } | null> {
  const [row] = await db
    .update(marketingContacts)
    .set({ unsubscribedAt: new Date(), syncedAt: null, updatedAt: new Date() })
    .where(and(eq(marketingContacts.id, id), isNull(marketingContacts.unsubscribedAt)))
    .returning({ userId: marketingContacts.userId });
  return row ?? null;
}

/**
 * Resend says a contact unsubscribed (their own click, or a spam complaint).
 * Already true in Resend, so the row counts as synced. Returns the linked
 * account, if any, so its marketing setting can follow.
 */
export async function applyUnsubscribeFromResend(match: { resendContactId?: string; email?: string }): Promise<{ userId: string | null } | null> {
  const where = match.resendContactId
    ? eq(marketingContacts.resendContactId, match.resendContactId)
    : match.email
      ? eq(marketingContacts.email, match.email.trim().toLowerCase())
      : null;
  if (!where) return null;
  const now = new Date();
  const [row] = await db
    .update(marketingContacts)
    .set({ unsubscribedAt: now, syncedAt: now, updatedAt: now })
    .where(and(where, isNull(marketingContacts.unsubscribedAt)))
    .returning({ userId: marketingContacts.userId });
  return row ?? null;
}

export async function pendingContacts(limit: number, testAddressesOnly: boolean) {
  return db
    .select()
    .from(marketingContacts)
    .where(
      and(
        isNull(marketingContacts.syncedAt),
        testAddressesOnly ? sql`${marketingContacts.email} LIKE '%@resend.dev'` : undefined
      )
    )
    .orderBy(asc(marketingContacts.createdAt))
    .limit(limit);
}

/** Marks the push done, unless the row changed meanwhile (then it waits for the next push). */
export async function markContactSynced(id: string, resendContactId: string, readUpdatedAt: Date): Promise<void> {
  await db
    .update(marketingContacts)
    .set({ resendContactId, syncedAt: new Date() })
    .where(
      and(
        eq(marketingContacts.id, id),
        // Postgres keeps microseconds, a JS Date only milliseconds.
        sql`date_trunc('milliseconds', ${marketingContacts.updatedAt}) = ${readUpdatedAt.toISOString()}::timestamptz`
      )
    );
}

/** Subscribed contacts a campaign would reach. */
export async function audienceSize(audience: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(marketingContacts)
    .where(
      and(
        isNull(marketingContacts.unsubscribedAt),
        audience === AUDIENCE_ALL ? undefined : eq(marketingContacts.source, audience)
      )
    );
  return Number(row?.n ?? 0);
}

/* ── Campaigns ──────────────────────────────────────────────────────── */

const listColumns = {
  id: marketingCampaigns.id,
  name: marketingCampaigns.name,
  subject: marketingCampaigns.subject,
  audience: marketingCampaigns.audience,
  status: marketingCampaigns.status,
  scheduledAt: marketingCampaigns.scheduledAt,
  sentAt: marketingCampaigns.sentAt,
  recipientCount: marketingCampaigns.recipientCount,
  updatedAt: marketingCampaigns.updatedAt,
};

export async function listCampaigns(): Promise<CampaignListItem[]> {
  return db.select(listColumns).from(marketingCampaigns).orderBy(desc(marketingCampaigns.updatedAt));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const [row] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).limit(1);
  return row ?? null;
}

export async function createCampaign(createdBy: string, name: string): Promise<string> {
  const [row] = await db
    .insert(marketingCampaigns)
    .values({ name, createdBy })
    .returning({ id: marketingCampaigns.id });
  return row.id;
}

type CampaignFields = Pick<
  Campaign,
  "name" | "subject" | "previewText" | "heading" | "body" | "imageUrl" | "buttonLabel" | "buttonUrl" | "audience"
>;

/** Only drafts change; returns false when the campaign isn't a draft any more. */
export async function updateDraft(id: string, fields: CampaignFields): Promise<boolean> {
  const rows = await db
    .update(marketingCampaigns)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.status, "DRAFT")))
    .returning({ id: marketingCampaigns.id });
  return rows.length > 0;
}

export async function deleteDraft(id: string): Promise<boolean> {
  const rows = await db
    .delete(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.status, "DRAFT")))
    .returning({ id: marketingCampaigns.id });
  return rows.length > 0;
}

export async function markCampaignSent(
  id: string,
  sent: { resendBroadcastId: string; recipientCount: number; scheduledAt: Date | null }
): Promise<void> {
  const now = new Date();
  await db
    .update(marketingCampaigns)
    .set({
      status: sent.scheduledAt ? "SCHEDULED" : "SENT",
      resendBroadcastId: sent.resendBroadcastId,
      recipientCount: sent.recipientCount,
      scheduledAt: sent.scheduledAt,
      sentAt: sent.scheduledAt ? null : now,
      updatedAt: now,
    })
    .where(eq(marketingCampaigns.id, id));
}

/** A cancelled schedule goes back to being an editable draft. */
export async function markCampaignUnscheduled(id: string): Promise<void> {
  await db
    .update(marketingCampaigns)
    .set({ status: "DRAFT", resendBroadcastId: null, scheduledAt: null, recipientCount: null, updatedAt: new Date() })
    .where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.status, "SCHEDULED")));
}

/** Keep an account's "marketing emails" setting in step with its contact. */
export async function setAccountMarketingFlag(userId: string, enabled: boolean): Promise<void> {
  await db.execute(sql`UPDATE "user" SET marketing_emails_enabled = ${enabled}, updated_at = now() WHERE id = ${userId}`);
}
