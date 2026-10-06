import { createHmac, timingSafeEqual } from "crypto";

/**
 * Short-lived signed proofs for the booking flow's texted-code sign-in. The
 * code is checked once, with Twilio (features/auth/phone-sign-in.data.ts);
 * what happens next carries one of these instead of the code:
 *
 * - sign-in: "this account has proven it owns this number" (5 minutes)
 * - sign-up: "someone just proved they own this number" (15 minutes, long
 *   enough to type their name and email)
 *
 * Each proof names its purpose, so one can never stand in for the other.
 */

const SIGN_IN_TTL_MS = 5 * 60 * 1000;
const SIGN_UP_TTL_MS = 15 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

function sign(fields: string[], ttlMs: number): string {
  const payload = [...fields, String(Date.now() + ttlMs)].join("|");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

/** The signed fields (without the expiry), or null when forged or expired. */
function verify(proof: string): string[] | null {
  try {
    const decoded = Buffer.from(proof, "base64url").toString("utf8");
    const lastPipe = decoded.lastIndexOf("|");
    if (lastPipe === -1) return null;

    const payload = decoded.slice(0, lastPipe);
    const sig = Buffer.from(decoded.slice(lastPipe + 1), "hex");
    const expected = Buffer.from(createHmac("sha256", getSecret()).update(payload).digest("hex"), "hex");
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

    const fields = payload.split("|");
    const expires = Number(fields.pop());
    if (!Number.isFinite(expires) || Date.now() > expires) return null;
    return fields;
  } catch {
    return null;
  }
}

export function createPhoneBookingProof(userId: string, phone: string): string {
  return sign(["sign-in", userId, phone], SIGN_IN_TTL_MS);
}

export function verifyPhoneBookingProof(proof: string): { userId: string; phone: string } | null {
  const fields = verify(proof);
  if (!fields || fields.length !== 3 || fields[0] !== "sign-in") return null;
  const [, userId, phone] = fields;
  return userId && phone ? { userId, phone } : null;
}

export function createPhoneSignUpProof(phone: string): string {
  return sign(["sign-up", phone], SIGN_UP_TTL_MS);
}

export function verifyPhoneSignUpProof(proof: string): { phone: string } | null {
  const fields = verify(proof);
  if (!fields || fields.length !== 2 || fields[0] !== "sign-up") return null;
  return fields[1] ? { phone: fields[1] } : null;
}
