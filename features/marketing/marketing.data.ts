import "server-only";

import { z } from "zod";
import * as marketing from "@/features/marketing/marketing.service";
import * as resendMarketing from "@/features/marketing/resend-marketing.service";
import { getMailingAddress, saveMailingAddress } from "@/features/app-settings/app-settings.service";
import { cleanEmail, type ImportedContact } from "@/features/marketing/lib/contact-import";
import { renderCampaignEmail, safeUrl } from "@/features/marketing/lib/campaign-email";
import { AUDIENCE_ALL, type Campaign, type ContactSummary } from "@/features/marketing/marketing.types";
import { AccessDenied, UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";

/**
 * Marketing data layer: contacts, campaigns and sending (marketing:send,
 * admins). The Resend webhook and the hourly sync come in without a session
 * and check their own credentials.
 */

const assertMarketing = () => assertCan({ marketing: ["send"] });

/* ── Overview & contacts ────────────────────────────────────────────── */

export async function getMarketingOverview() {
  await assertMarketing();
  const [summary, campaigns, mailingAddress] = await Promise.all([
    marketing.getContactSummary(),
    marketing.listCampaigns(),
    getMailingAddress(),
  ]);
  return { summary, campaigns, mailingAddress, from: resendMarketing.MARKETING_FROM };
}

export async function getContactSummary(): Promise<ContactSummary> {
  await assertMarketing();
  return marketing.getContactSummary();
}

export async function listMarketingContacts(params: Parameters<typeof marketing.listContacts>[0]) {
  await assertMarketing();
  return marketing.listContacts(params);
}

/** Which of these addresses are already on the list (the import preview). */
export async function countAlreadyListed(emails: string[]): Promise<number> {
  await assertMarketing();
  return (await marketing.findExistingEmails(emails.slice(0, 20000))).size;
}

const MAX_IMPORT = 20000;

/** Save one file's contacts under a list name. Addresses are re-checked here, not trusted. */
export async function importContacts(source: string, contacts: ImportedContact[]): Promise<{ added: number; alreadyListed: number }> {
  await assertMarketing();
  const name = source.trim().slice(0, 60);
  if (!name) throw new UserFacingError("Give the list a name.");
  if (name.toUpperCase() === AUDIENCE_ALL) throw new UserFacingError(`"${name}" is reserved. Pick another list name.`);
  if (contacts.length > MAX_IMPORT) throw new UserFacingError(`Import up to ${MAX_IMPORT.toLocaleString()} contacts at a time.`);
  const seen = new Set<string>();
  const clean: ImportedContact[] = [];
  for (const c of contacts) {
    const check = cleanEmail(String(c.email ?? ""));
    if (!check.ok || seen.has(check.email)) continue;
    seen.add(check.email);
    const part = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null);
    clean.push({ email: check.email, firstName: part(c.firstName), lastName: part(c.lastName) });
  }
  const added = await marketing.insertContacts(clean, name);
  return { added, alreadyListed: clean.length - added };
}

export async function unsubscribeContact(id: string): Promise<void> {
  await assertMarketing();
  const row = await marketing.unsubscribeContact(id);
  if (row?.userId) await marketing.setAccountMarketingFlag(row.userId, false);
}

/* ── Sync to Resend ─────────────────────────────────────────────────── */

/** Resend allows 10 requests a second for the whole team; leave room for booking emails. */
const PUSH_INTERVAL_MS = 130;

async function pushPending(budgetMs: number): Promise<{ pushed: number; remaining: number; error: string | null }> {
  const stopAt = Date.now() + budgetMs;
  let pushed = 0;
  let error: string | null = null;
  outer: while (Date.now() < stopAt) {
    const batch = await marketing.pendingContacts(50, resendMarketing.TEST_ADDRESSES_ONLY);
    if (batch.length === 0) break;
    for (const row of batch) {
      if (Date.now() >= stopAt) break outer;
      const started = Date.now();
      try {
        const id = await resendMarketing.pushContact({
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          source: row.source,
          unsubscribed: row.unsubscribedAt !== null,
          resendContactId: row.resendContactId,
        });
        await marketing.markContactSynced(row.id, id, row.updatedAt);
        pushed++;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        break outer;
      }
      const wait = PUSH_INTERVAL_MS - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  }
  const { pending } = await marketing.getContactSummary();
  return { pushed, remaining: pending, error };
}

/**
 * Add accounts and booked customers, then push waiting changes to Resend for
 * up to ~25 seconds. The page calls it again until nothing remains.
 */
export async function syncContacts(): Promise<{ pushed: number; remaining: number; error: string | null }> {
  await assertMarketing();
  await marketing.refreshAutomaticContacts(resendMarketing.TEST_ADDRESSES_ONLY);
  return pushPending(25_000);
}

/** Hourly (Vercel Cron): the same sync, so account changes reach Resend without anyone clicking. */
export async function runScheduledMarketingSync(authorization: string | null) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (authorization !== `Bearer ${cronSecret}`) throw new AccessDenied("Unauthorized", 401);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET is not configured");
  }
  await marketing.refreshAutomaticContacts(resendMarketing.TEST_ADDRESSES_ONLY);
  return pushPending(45_000);
}

/* ── Resend webhook ─────────────────────────────────────────────────── */

/**
 * Unsubscribes and spam complaints from Resend. Whatever the route, the
 * contact is marked unsubscribed here and on its account.
 */
export async function handleResendWebhook(payload: string, headers: { id: string; timestamp: string; signature: string }): Promise<void> {
  if (!process.env.RESEND_WEBHOOK_SECRET) throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  let event: ReturnType<typeof resendMarketing.verifyResendWebhook>;
  try {
    event = resendMarketing.verifyResendWebhook(payload, headers);
  } catch {
    throw new AccessDenied("Invalid webhook signature", 401);
  }
  let row: { userId: string | null } | null = null;
  if ((event.type === "contact.updated" && event.data.unsubscribed) || event.type === "contact.deleted") {
    row = await marketing.applyUnsubscribeFromResend({ resendContactId: event.data.id, email: event.data.email });
  } else if (event.type === "email.complained") {
    for (const to of event.data.to) {
      row = (await marketing.applyUnsubscribeFromResend({ email: to })) ?? row;
    }
  }
  if (row?.userId) await marketing.setAccountMarketingFlag(row.userId, false);
}

/* ── Mailing address ────────────────────────────────────────────────── */

export async function updateMailingAddress(address: string): Promise<void> {
  const admin = await assertMarketing();
  const value = address.trim().slice(0, 300);
  await saveMailingAddress(value || null, admin.id);
}

/* ── Campaigns ──────────────────────────────────────────────────────── */

export async function createCampaign(): Promise<string> {
  const admin = await assertMarketing();
  return marketing.createCampaign(admin.id, "Untitled campaign");
}

export async function getCampaignEditor(id: string) {
  await assertMarketing();
  const [campaign, summary, mailingAddress] = await Promise.all([
    marketing.getCampaign(id),
    marketing.getContactSummary(),
    getMailingAddress(),
  ]);
  if (!campaign) return null;
  return {
    campaign,
    audiences: [{ value: AUDIENCE_ALL, label: "Everyone", size: summary.subscribed }].concat(
      summary.sources.map((s) => ({ value: s.source, label: s.source, size: s.subscribed }))
    ),
    pending: summary.pending,
    mailingAddress,
    from: resendMarketing.MARKETING_FROM,
  };
}

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .refine((v) => v === null || safeUrl(v) !== null, "Links must start with https://");

const draftSchema = z.object({
  name: z.string().trim().min(1, "Give the campaign a name.").max(120),
  subject: z.string().trim().max(150),
  previewText: z.string().trim().max(200),
  heading: z.string().trim().max(150),
  body: z.string().max(20000),
  imageUrl: optionalUrl,
  buttonLabel: z.string().trim().max(40).transform((v) => v || null),
  buttonUrl: optionalUrl,
  audience: z.string().trim().min(1).max(60),
});

export type CampaignDraftInput = z.input<typeof draftSchema>;

export async function saveCampaignDraft(id: string, input: CampaignDraftInput): Promise<void> {
  await assertMarketing();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Check the campaign fields.");
  const saved = await marketing.updateDraft(id, parsed.data);
  if (!saved) throw new UserFacingError("This campaign has already been sent or scheduled.", 409);
}

export async function deleteCampaignDraft(id: string): Promise<void> {
  await assertMarketing();
  if (!(await marketing.deleteDraft(id))) throw new UserFacingError("Only drafts can be deleted.", 409);
}

function contentOf(c: Campaign) {
  return {
    previewText: c.previewText,
    heading: c.heading,
    body: c.body,
    imageUrl: c.imageUrl,
    buttonLabel: c.buttonLabel,
    buttonUrl: c.buttonUrl,
  };
}

/** Everything a campaign needs before it can go out, as one plain sentence. */
function readinessError(c: Campaign, mailingAddress: string | null): string | null {
  if (!mailingAddress) return "Add the company's mailing address first. Every marketing email has to show one.";
  if (!c.subject.trim()) return "Add a subject line.";
  if (!c.body.trim() && !c.heading.trim()) return "Write the email first.";
  if (c.buttonLabel && !c.buttonUrl) return "The button needs a link.";
  if (c.buttonUrl && !c.buttonLabel) return "The button needs a label.";
  return null;
}

export async function sendCampaignTest(id: string, to: string): Promise<void> {
  const admin = await assertMarketing();
  const campaign = await marketing.getCampaign(id);
  if (!campaign) throw new UserFacingError("Campaign not found.", 404);
  const address = cleanEmail(to);
  if (!address.ok) throw new UserFacingError("Enter a valid email address for the test.");
  const mailingAddress = (await getMailingAddress()) ?? "";
  if (!campaign.subject.trim()) throw new UserFacingError("Add a subject line first.");
  const firstName = admin.name?.split(/\s+/)[0] || "there";
  const email = renderCampaignEmail(contentOf(campaign), { kind: "sample", mailingAddress, firstName });
  await resendMarketing.sendTestEmail(address.email, { subject: campaign.subject, ...email });
}

/** Send now, or schedule for later. Unsynced changes must reach Resend first. */
export async function sendCampaign(id: string, scheduledAt: Date | null): Promise<void> {
  await assertMarketing();
  const [campaign, mailingAddress, summary] = await Promise.all([
    marketing.getCampaign(id),
    getMailingAddress(),
    marketing.getContactSummary(),
  ]);
  if (!campaign) throw new UserFacingError("Campaign not found.", 404);
  if (campaign.status !== "DRAFT") throw new UserFacingError("This campaign has already been sent or scheduled.", 409);
  const problem = readinessError(campaign, mailingAddress);
  if (problem) throw new UserFacingError(problem);
  if (summary.pending > 0) {
    throw new UserFacingError(
      `${summary.pending.toLocaleString()} contact changes haven't reached Resend yet. Sync contacts first, so nobody who unsubscribed gets this.`
    );
  }
  if (scheduledAt) {
    const ms = scheduledAt.getTime() - Date.now();
    if (Number.isNaN(ms) || ms < 5 * 60_000) throw new UserFacingError("Schedule it at least 5 minutes from now.");
    if (ms > 30 * 86_400_000) throw new UserFacingError("Schedule it within the next 30 days.");
  }
  const recipients = await marketing.audienceSize(campaign.audience);
  if (recipients === 0) throw new UserFacingError("Nobody on that list is subscribed.");

  const email = renderCampaignEmail(contentOf(campaign), { kind: "broadcast", mailingAddress: mailingAddress! });
  const broadcastId = await resendMarketing.createBroadcast({
    name: campaign.name,
    subject: campaign.subject,
    previewText: campaign.previewText,
    ...email,
    audience: campaign.audience,
    scheduledAt,
  });
  await marketing.markCampaignSent(id, { resendBroadcastId: broadcastId, recipientCount: recipients, scheduledAt });
}

export async function cancelScheduledCampaign(id: string): Promise<void> {
  await assertMarketing();
  const campaign = await marketing.getCampaign(id);
  if (!campaign || campaign.status !== "SCHEDULED" || !campaign.resendBroadcastId) {
    throw new UserFacingError("Only a scheduled campaign can be cancelled.", 409);
  }
  if (campaign.scheduledAt && campaign.scheduledAt.getTime() <= Date.now()) {
    throw new UserFacingError("It's already gone out.", 409);
  }
  await resendMarketing.cancelBroadcast(campaign.resendBroadcastId);
  await marketing.markCampaignUnscheduled(id);
}
