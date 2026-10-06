import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import {
  MARKETPLACE_SENDER_DOMAINS,
  htmlToText,
  processMarketplaceEmail,
  setInboundEmailOutcome,
  storeInboundEmail,
} from "@/features/bookings/services/inbound-lead.service";
import { AccessDenied, UserFacingError } from "@/shared/lib/errors";

/**
 * Inbound email data layer: marketplace notification emails Resend forwards
 * to us. No session — Resend proves itself with its webhook signature. Every
 * email is stored raw first (crash-safe, deduped), then known marketplace
 * senders become INQUIRY deals.
 */

const MAX_BODY_BYTES = 1_000_000; // 1MB — notification emails are tiny
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify the Resend webhook signature (svix scheme): HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${body}` with the base64 part of the whsec_
 * secret; the header carries space-separated "v1,<sig>".
 */
function verifySignature(payload: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${payload}`).digest();

  return signatureHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const candidate = Buffer.from(sig, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

/** Pull an email address out of "Name <a@b.com>", {email}, or arrays thereof. */
function extractAddress(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return extractAddress(value[0]);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return extractAddress(obj.email ?? obj.address ?? null);
  }
  if (typeof value === "string") {
    return value.match(/<([^>]+)>/)?.[1]?.trim() ?? value.trim();
  }
  return null;
}

/**
 * Receive one delivery. Returns what happened (always a success to Resend
 * once the email is stored, so it doesn't hammer retries — a failed parse
 * stays stored for reprocessing).
 */
export async function receiveInboundEmail(payload: string, headers: Headers): Promise<Record<string, unknown>> {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) throw new Error("RESEND_INBOUND_WEBHOOK_SECRET is not set — rejecting inbound email");
  if (payload.length > MAX_BODY_BYTES) throw new UserFacingError("Payload too large");
  if (!verifySignature(payload, headers, secret)) throw new AccessDenied("Invalid signature", 401);

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(payload);
  } catch {
    throw new UserFacingError("Invalid JSON");
  }

  // Resend wraps the email in `data`; tolerate both shapes.
  const data = (event.data ?? event) as Record<string, unknown>;
  const headersObj = (data.headers ?? {}) as Record<string, unknown>;
  const fromAddress = extractAddress(data.from);
  const toAddress = extractAddress(data.to);
  const subject = typeof data.subject === "string" ? data.subject : "";
  const rawHtml = typeof data.html === "string" ? data.html : null;
  const rawText = typeof data.text === "string" ? data.text : null;
  const messageId =
    (typeof data.message_id === "string" && data.message_id) ||
    (typeof data.messageId === "string" && data.messageId) ||
    (typeof headersObj["message-id"] === "string" && (headersObj["message-id"] as string)) ||
    (typeof event.id === "string" && (event.id as string)) ||
    null;

  // Not an email payload we understand (e.g. a different Resend event type).
  if (!fromAddress || !messageId) return { ok: true, skipped: "unrecognized payload" };

  const stored = await storeInboundEmail({ messageId, fromAddress, toAddress, subject, rawHtml, rawText });
  if (!stored) return { ok: true, skipped: "duplicate" };

  // Classify the sender; unknown senders are stored but ignored.
  const fromDomain = fromAddress.split("@")[1]?.toLowerCase() ?? "";
  const source = Object.entries(MARKETPLACE_SENDER_DOMAINS).find(
    ([domain]) => fromDomain === domain || fromDomain.endsWith(`.${domain}`)
  )?.[1];
  if (!source) {
    await setInboundEmailOutcome(stored.id, { parseStatus: "IGNORED" });
    return { ok: true, skipped: "unknown sender" };
  }

  try {
    const text = rawText?.trim() || (rawHtml ? htmlToText(rawHtml) : "");
    const { dealId, method } = await processMarketplaceEmail({ source, fromAddress, subject, text });
    await setInboundEmailOutcome(stored.id, { parseStatus: method, dealId });
    return { ok: true, dealId, method };
  } catch (error) {
    console.error("Inbound email processing failed:", error);
    await setInboundEmailOutcome(stored.id, {
      parseStatus: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { ok: true, stored: true, parsed: false };
  }
}
