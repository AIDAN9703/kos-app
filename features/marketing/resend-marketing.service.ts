import "server-only";

import { Resend } from "resend";
import { AUDIENCE_ALL } from "@/features/marketing/marketing.types";

/**
 * Resend's side of marketing: contacts, segments (one per list, plus
 * everyone), broadcasts, test sends and webhook checks. Resend sends the
 * broadcasts and runs the unsubscribe link and preference page.
 */

export const MARKETING_FROM = "Kings of the Sea Yachts <marketing@kosyachts.com>";
const MARKETING_REPLY_TO = "contact@kosyachts.com";

/* Contacts are shared across the whole Resend team, so local dev and preview
   deployments use their own segments, and only push test addresses
   (…@resend.dev): a dev database full of real people never reaches Resend. */
const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";
export const TEST_ADDRESSES_ONLY = !isProduction;

let client: Resend | null = null;
function resend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Resend ${what} failed: ${error?.message ?? "no response"}`);
}

function segmentName(list: string): string {
  const name = list === AUDIENCE_ALL ? "KOS · Everyone" : `KOS · ${list}`;
  // "[dev]" lists in Resend hold real addresses from an early sync before the test-only rule: never reuse them.
  return isProduction ? name : `[test] ${name}`;
}

const segmentIds = new Map<string, string>();

/** The Resend segment for a list ("ALL" or a source), created the first time it's needed. */
async function segmentFor(list: string): Promise<string> {
  const name = segmentName(list);
  if (segmentIds.has(name)) return segmentIds.get(name)!;
  let after: string | undefined;
  do {
    const { data, error } = await resend().segments.list(after ? { limit: 100, after } : { limit: 100 });
    if (!data) fail("listing segments", error);
    data.data.forEach((s) => segmentIds.set(s.name, s.id));
    after = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
  } while (after && !segmentIds.has(name));
  if (!segmentIds.has(name)) {
    const { data, error } = await resend().segments.create({ name });
    if (!data) fail("creating a segment", error);
    segmentIds.set(name, data.id);
  }
  return segmentIds.get(name)!;
}

/** Create the contact in Resend (in Everyone and its own list), or update it. Returns Resend's id. */
export async function pushContact(contact: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string;
  unsubscribed: boolean;
  resendContactId: string | null;
}): Promise<string> {
  const segments = [{ id: await segmentFor(AUDIENCE_ALL) }, { id: await segmentFor(contact.source) }];
  if (!contact.resendContactId) {
    const { data, error } = await resend().contacts.create({
      email: contact.email,
      firstName: contact.firstName ?? undefined,
      lastName: contact.lastName ?? undefined,
      unsubscribed: contact.unsubscribed,
      segments,
    });
    if (data) return data.id;
    // Already in Resend (added in its dashboard, or by another environment): update it below.
    if (error?.statusCode !== 409 && !/exist/i.test(error?.message ?? "")) fail("creating a contact", error);
  }
  const select = contact.resendContactId ? { id: contact.resendContactId } : { email: contact.email };
  const { data, error } = await resend().contacts.update({
    ...select,
    unsubscribed: contact.unsubscribed,
    firstName: contact.firstName,
    lastName: contact.lastName,
  });
  if (!data) fail("updating a contact", error);
  if (!contact.resendContactId) {
    for (const segment of segments) {
      const added = await resend().contacts.segments.add({ contactId: data.id, segmentId: segment.id });
      if (added.error && !/exist|already/i.test(added.error.message)) fail("adding a contact to a list", added.error);
    }
  }
  return data.id;
}

/** Send now, or schedule; returns the broadcast id. */
export async function createBroadcast(campaign: {
  name: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
  audience: string;
  scheduledAt: Date | null;
}): Promise<string> {
  const { data, error } = await resend().broadcasts.create({
    segmentId: await segmentFor(campaign.audience),
    from: MARKETING_FROM,
    replyTo: MARKETING_REPLY_TO,
    name: campaign.name,
    subject: campaign.subject,
    previewText: campaign.previewText || undefined,
    html: campaign.html,
    text: campaign.text,
    send: true,
    ...(campaign.scheduledAt ? { scheduledAt: campaign.scheduledAt.toISOString() } : {}),
  });
  if (!data) fail("sending the campaign", error);
  return data.id;
}

/** Cancel a scheduled broadcast (Resend returns it to a draft on its side). */
export async function cancelBroadcast(id: string): Promise<void> {
  const res = await fetch(`https://api.resend.com/broadcasts/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Resend cancelling the campaign failed: ${body?.message ?? res.status}`);
  }
}

/** A one-off copy to one inbox, so the team can check it before it goes out. */
export async function sendTestEmail(to: string, email: { subject: string; html: string; text: string }): Promise<void> {
  const { error } = await resend().emails.send({
    from: MARKETING_FROM,
    to,
    replyTo: MARKETING_REPLY_TO,
    subject: `[Test] ${email.subject}`,
    html: email.html,
    text: email.text,
  });
  if (error) fail("sending the test", error);
}

/** Check a webhook really came from Resend; throws when the signature doesn't match. */
export function verifyResendWebhook(payload: string, headers: { id: string; timestamp: string; signature: string }) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  return resend().webhooks.verify({ payload, headers, webhookSecret });
}
