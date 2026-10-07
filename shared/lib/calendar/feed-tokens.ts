/**
 * HMAC-signed tokens for the public KOS calendar feed.
 *
 * No DB schema: a feed URL is just `?token=<hmac>&...filters`. The HMAC binds
 * the filter combination to a server-side secret, so URLs can't be forged
 * client-side. Revoking is done by rotating `CALENDAR_FEED_SECRET`.
 *
 * Why HMAC instead of opaque DB tokens for now: avoids a migration and a UI
 * for token management. Once we want per-user revocation, we can switch to a
 * `calendar_feed_token` table keyed by `userId` (boat owner, captain) — the
 * route signature stays the same.
 */

import crypto from "node:crypto";

const ENV_VAR = "CALENDAR_FEED_SECRET";
/** Filter knobs the HMAC binds — same list as `verifyFeedToken` reads. */
const SIGNED_KEYS = ["scope", "boatId", "captainId", "ownerId"] as const;

export type FeedScope = "bookings";

interface FeedTokenInput {
  /** What kind of feed this token authorizes. Today only `bookings` exists. */
  scope: FeedScope;
  boatId?: string;
  captainId?: string;
  ownerId?: string;
}

function getSecret(): string {
  const secret = process.env[ENV_VAR];
  if (!secret) {
    throw new Error(
      `${ENV_VAR} is not set — required to sign calendar feed URLs`,
    );
  }
  return secret;
}

/** Canonical serialization so signing/verifying are deterministic. */
function canonicalize(input: FeedTokenInput): string {
  const bag = input as unknown as Record<string, string | undefined>;
  const parts: string[] = [];
  for (const key of SIGNED_KEYS) {
    const value = bag[key];
    if (value != null && value !== "") parts.push(`${key}=${value}`);
  }
  return parts.join("&");
}

function signFeedToken(input: FeedTokenInput): string {
  const message = canonicalize(input);
  return crypto.createHmac("sha256", getSecret()).update(message).digest("hex");
}

export function verifyFeedToken(input: FeedTokenInput, token: string): boolean {
  if (!token) return false;
  const expected = signFeedToken(input);
  // Use timingSafeEqual on hex buffers of equal length to avoid timing leaks.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Build the full subscribe URL for a given feed.
 *
 * @param origin e.g. `https://kosyachts.com`
 */
export function buildFeedUrl(origin: string, input: FeedTokenInput): string {
  const bag = input as unknown as Record<string, string | undefined>;
  const token = signFeedToken(input);
  const params = new URLSearchParams({ token });
  for (const key of SIGNED_KEYS) {
    const value = bag[key];
    if (value != null && value !== "") params.set(key, value);
  }
  return `${origin.replace(/\/$/, "")}/api/calendar/feed.ics?${params.toString()}`;
}
