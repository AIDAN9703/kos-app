/**
 * One-shot seed: KOS captains, crew, and stews from operator's phone list.
 *
 * - Captains land in `captain_profile` (status ACTIVE).
 * - Crew + stews land in `crew_profile` (status ACTIVE). Per-trip role
 *   (DECKHAND / STEW / MATE / INSTRUCTOR) lives on `booking_crew.role`
 *   when they're assigned, not on the profile.
 * - A person can have BOTH profiles (captain who also takes crew gigs).
 *
 * Idempotency: matches existing users by (phoneNumber + firstName).
 * Re-running the script is safe — it only inserts what's missing.
 *
 * Run with:
 *   npm run db:seed-captains-crew -- --dry-run        # safe preview, DEV
 *   npm run db:seed-captains-crew                     # write to DEV
 *   npm run db:seed-captains-crew -- --prod --dry-run # preview PROD plan
 *   npm run db:seed-captains-crew -- --prod           # write to PROD (asks to confirm)
 */

import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config as loadEnv } from "dotenv";
import { hash } from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/database/schema";

// Load env vars from .env.local (Next.js convention). We intentionally do not
// import "@/database/db" here because that module reads DATABASE_URL at load
// time — we set up our own drizzle client below after dotenv has run.
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const TARGET_PROD = process.argv.includes("--prod");
const DRY_RUN = process.argv.includes("--dry-run");

const targetUrl = TARGET_PROD
  ? process.env.PROD_DATABASE_URL
  : process.env.DATABASE_URL;
const targetLabel = TARGET_PROD ? "PROD" : "DEV";

if (!targetUrl) {
  const envName = TARGET_PROD ? "PROD_DATABASE_URL" : "DATABASE_URL";
  console.error(
    `${envName} not found. Expected it in .env.local at the project root.`
  );
  process.exit(1);
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.split(".").slice(0, 2).join(".");
    return `${u.protocol}//${u.username}:***@${host}/${u.pathname.replace(/^\//, "")}`;
  } catch {
    return "(unparseable URL)";
  }
}

console.log(`Target database: ${targetLabel}  →  ${maskUrl(targetUrl)}\n`);

const { users, accounts, captainProfiles, crewProfiles } = schema;
const db = drizzle({ client: neon(targetUrl), schema });

/**
 * Shared default password for every seeded captain/crew/stew.
 * Once their `users.email` is updated to a real address, they can log in
 * with this password and reset it from the account settings page.
 */
const SEED_DEFAULT_PASSWORD = "Kos2026$";

type Pool = "captain" | "crew";

type DefaultCrewRole = "DECKHAND" | "STEW" | "MATE" | "INSTRUCTOR";

interface PersonInput {
  firstName: string;
  lastName: string | null;
  /** E.164 (+1XXXXXXXXXX) or null if unknown / incomplete. */
  phone: string | null;
  pools: Pool[];
  /** True for FL Boat License holders — captain pool, but not USCG. */
  flLicenseOnly?: boolean;
  /** Default role guidance for crew pool (DECKHAND, STEW, etc.). */
  defaultCrewRole?: DefaultCrewRole;
  nickname?: string;
  /** Extra note appended to admin notes on the profile. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Data — captains, crew, stews
// ---------------------------------------------------------------------------

const CAPTAINS: PersonInput[] = [
  { firstName: "Emanuel", lastName: "Diaz", phone: "+13366533774", pools: ["captain"], nickname: "Manny" },
  { firstName: "Luca", lastName: null, phone: "+17542728325", pools: ["captain"], note: "First name only — collect last name when available" },
  { firstName: "Alex", lastName: "Perez", phone: "+17865759323", pools: ["captain"] },
  { firstName: "Alessandro", lastName: "Theodoli", phone: "+17862183120", pools: ["captain"] },
  { firstName: "Jose", lastName: "Suarez", phone: "+17863277433", pools: ["captain"] },
  { firstName: "Ace", lastName: "Svoda", phone: "+17862850300", pools: ["captain"] },
  { firstName: "Emilio", lastName: "Rosche", phone: "+17868997352", pools: ["captain"] },
  { firstName: "Marcial", lastName: null, phone: "+17864615775", pools: ["captain"], note: "First name only — collect last name when available" },
  { firstName: "Omar", lastName: "Briceno", phone: "+17867596936", pools: ["captain"] },
  { firstName: "Valeria", lastName: "Diaz", phone: "+17864952652", pools: ["captain"], note: "Shares phone with Claudia Amador (stew) — confirm relationship" },
  { firstName: "Aaron", lastName: "Weltz", phone: "+17869734061", pools: ["captain"], flLicenseOnly: true },
  { firstName: "Connor", lastName: "Motsko", phone: "+14435459151", pools: ["captain"], flLicenseOnly: true },
  { firstName: "Angel", lastName: "Perez", phone: "+17864920031", pools: ["captain"], flLicenseOnly: true },
  { firstName: "AJ", lastName: null, phone: "+13057999732", pools: ["captain"], note: "First name only — collect last name when available" },
  { firstName: "Alex", lastName: "Lam", phone: "+17869614289", pools: ["captain"] },
  { firstName: "Leo", lastName: null, phone: "+17864472300", pools: ["captain"], note: "First name only — collect last name when available" },
  { firstName: "Max", lastName: "Anker", phone: "+19172392532", pools: ["captain"] },
  { firstName: "Chip", lastName: null, phone: "+12034560109", pools: ["captain"], note: "First name only — collect last name when available" },
  { firstName: "Francisco", lastName: null, phone: "+13476565188", pools: ["captain"], note: "First name only — collect last name when available" },
  { firstName: "Ben", lastName: "Snyder", phone: "+16176106811", pools: ["captain"] },
  { firstName: "Pedro", lastName: "de la Cruz", phone: "+13058967200", pools: ["captain"] },
  { firstName: "Oscar", lastName: "Brea", phone: "+17865254334", pools: ["captain"] },
  { firstName: "Efrain", lastName: "Ruffo", phone: "+14893331820", pools: ["captain"] },
];

const CREW_MAXUM: PersonInput[] = [
  { firstName: "Joel", lastName: "Martinez", phone: "+17865875850", pools: ["crew"] },
  { firstName: "Mar", lastName: "Dosil", phone: "+13056807428", pools: ["crew"] },
  { firstName: "Juan", lastName: "Iliopulos", phone: "+19544791678", pools: ["crew"] },
  { firstName: "Iosef", lastName: "Suarez", phone: "+17864482741", pools: ["crew"], nickname: "Yoyo" },
  { firstName: "Kevin", lastName: "Cruz", phone: "+17866468530", pools: ["crew"] },
  { firstName: "Frankarlos", lastName: "Castillos", phone: "+17867922521", pools: ["crew"] },
  { firstName: "Jose", lastName: "Chaves", phone: "+17866262280", pools: ["crew"] },
  { firstName: "Luis", lastName: "Lopez", phone: "+17867171798", pools: ["crew"] },
  { firstName: "Julio", lastName: "Bordas", phone: "+17869733009", pools: ["crew"] },
  { firstName: "Steven", lastName: "Canal", phone: "+17862101101", pools: ["crew"] },
  { firstName: "Dermis", lastName: "Fernández", phone: "+17866239394", pools: ["crew"] },
  { firstName: "Jean Carlos", lastName: "Lebron", phone: "+17876101596", pools: ["crew"] },
  { firstName: "Camila", lastName: "Blian", phone: "+17869099835", pools: ["crew"] },
];

const STEWS: PersonInput[] = [
  { firstName: "Sheikerliz", lastName: "Jardim", phone: "+17867813004", pools: ["crew"], defaultCrewRole: "STEW" },
  { firstName: "Claudia", lastName: "Amador", phone: "+17864952652", pools: ["crew"], defaultCrewRole: "STEW", note: "Shares phone with Valeria Diaz (captain) — confirm relationship" },
  { firstName: "Anna", lastName: "Dynn", phone: "+19178681474", pools: ["crew"], defaultCrewRole: "STEW" },
  { firstName: "Janet", lastName: "Iskaef", phone: null, pools: ["crew"], defaultCrewRole: "STEW", note: "Phone incomplete in source list (786) 925-799* — collect full number" },
  { firstName: "Claudia", lastName: "Palomino", phone: "+19544884642", pools: ["crew"], defaultCrewRole: "STEW", nickname: "Macla" },
];

const ALL_PEOPLE: PersonInput[] = [...CAPTAINS, ...CREW_MAXUM, ...STEWS];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function personSlug(p: PersonInput): string {
  const parts = [p.firstName, p.lastName].filter((v): v is string => Boolean(v)).map(slugify);
  return parts.join("-") || "person";
}

function phoneDigits(phone: string | null): string {
  if (!phone) return "nophone";
  return phone.replace(/\D/g, "") || "nophone";
}

function placeholderEmail(p: PersonInput, primary: Pool): string {
  return `${primary}-${personSlug(p)}-${phoneDigits(p.phone)}@kos.placeholder`;
}

function placeholderUsername(p: PersonInput, primary: Pool): string {
  return `${primary}_${personSlug(p).replace(/-/g, "_")}_${phoneDigits(p.phone)}`;
}

function buildAdminNotes(p: PersonInput, defaultRole?: DefaultCrewRole): string | null {
  const lines = [
    p.nickname ? `Nickname: ${p.nickname}` : null,
    defaultRole ? `Default role: ${defaultRole}` : null,
    p.note ?? null,
  ].filter((v): v is string => Boolean(v));
  return lines.length > 0 ? lines.join("\n") : null;
}

function fullName(p: PersonInput): string {
  return `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`;
}

// ---------------------------------------------------------------------------
// DB ops
// ---------------------------------------------------------------------------

async function findExistingUser(p: PersonInput): Promise<string | null> {
  if (p.phone) {
    const [match] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.phoneNumber, p.phone),
          sql`LOWER(${users.firstName}) = ${p.firstName.toLowerCase()}`
        )
      )
      .limit(1);
    if (match) return match.id;
  }
  const email = placeholderEmail(p, p.pools[0]);
  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return byEmail?.id ?? null;
}

async function ensureUser(
  p: PersonInput,
  primary: Pool,
  hashedPassword: string,
  dryRun: boolean
): Promise<{ id: string; created: boolean }> {
  const existing = await findExistingUser(p);
  if (existing) return { id: existing, created: false };

  if (dryRun) {
    return { id: `dry-run-${phoneDigits(p.phone)}-${personSlug(p)}`, created: true };
  }

  const [created] = await db
    .insert(users)
    .values({
      email: placeholderEmail(p, primary),
      username: placeholderUsername(p, primary),
      name: [p.firstName, p.lastName].filter(Boolean).join(" "),
      firstName: p.firstName,
      lastName: p.lastName ?? null,
      phoneNumber: p.phone,
      status: "ACTIVE",
      emailVerified: false,
      phoneVerified: false,
    })
    .returning({ id: users.id });
  // Email + password sign-in with the shared seed password.
  await db.insert(accounts).values({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hashedPassword,
  });
  return { id: created.id, created: true };
}

/** Add a role to a seeded person (roles are comma-separated on user.role). */
async function grantRole(userId: string, role: "captain" | "crew") {
  await db
    .update(users)
    .set({
      role: sql`CASE WHEN ${users.role} = 'customer' THEN ${role} ELSE ${users.role} || ',' || ${role} END`,
    })
    .where(and(eq(users.id, userId), sql`NOT (${role} = ANY(string_to_array(${users.role}, ',')))`));
}

async function ensureCaptainProfile(
  userId: string,
  p: PersonInput,
  dryRun: boolean
): Promise<boolean> {
  if (!userId.startsWith("dry-run-")) {
    const [existing] = await db
      .select({ userId: captainProfiles.userId })
      .from(captainProfiles)
      .where(eq(captainProfiles.userId, userId))
      .limit(1);
    if (existing) return false;
  }

  if (dryRun) return true;

  await db.insert(captainProfiles).values({
    userId,
    status: "ACTIVE",
    uscgLicensed: !p.flLicenseOnly,
    licenseType: p.flLicenseOnly ? "FL Boat License" : null,
    adminNotes: buildAdminNotes(p),
  });
  await grantRole(userId, "captain");
  return true;
}

async function ensureCrewProfile(
  userId: string,
  p: PersonInput,
  dryRun: boolean
): Promise<boolean> {
  if (!userId.startsWith("dry-run-")) {
    const [existing] = await db
      .select({ userId: crewProfiles.userId })
      .from(crewProfiles)
      .where(eq(crewProfiles.userId, userId))
      .limit(1);
    if (existing) return false;
  }

  if (dryRun) return true;

  await db.insert(crewProfiles).values({
    userId,
    status: "ACTIVE",
    adminNotes: buildAdminNotes(p, p.defaultCrewRole),
  });
  await grantRole(userId, "crew");
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function confirmProdWrite(): Promise<boolean> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(
      `You are about to WRITE to PROD. Type "seed prod" to continue: `
    );
    return answer.trim().toLowerCase() === "seed prod";
  } finally {
    rl.close();
  }
}

async function main() {
  if (DRY_RUN) {
    console.log("DRY RUN — no database changes will be made.\n");
  } else if (TARGET_PROD) {
    const ok = await confirmProdWrite();
    if (!ok) {
      console.log("Aborted. Nothing written to prod.");
      process.exit(0);
    }
    console.log("");
  }

  console.log(`Importing ${ALL_PEOPLE.length} people…`);
  console.log(`Default password for every seeded user: ${SEED_DEFAULT_PASSWORD}\n`);

  // Hash once — the same password is reused for every seeded user.
  const hashedPassword = await hash(SEED_DEFAULT_PASSWORD, 10);

  let newUsers = 0;
  let existingUsers = 0;
  let newCaptainProfiles = 0;
  let existingCaptainProfiles = 0;
  let newCrewProfiles = 0;
  let existingCrewProfiles = 0;
  const errors: { person: string; reason: string }[] = [];

  for (const person of ALL_PEOPLE) {
    const primary = person.pools[0];
    const label = `${fullName(person).padEnd(28)} ${(person.phone ?? "no phone").padEnd(15)}`;

    try {
      const { id, created } = await ensureUser(person, primary, hashedPassword, DRY_RUN);
      if (created) {
        newUsers++;
        console.log(`[NEW USER]      ${label}`);
      } else {
        existingUsers++;
        console.log(`[EXISTING USER] ${label}`);
      }

      for (const pool of person.pools) {
        if (pool === "captain") {
          const inserted = await ensureCaptainProfile(id, person, DRY_RUN);
          if (inserted) {
            newCaptainProfiles++;
            console.log(`                  + captain_profile${person.flLicenseOnly ? " (FL Boat License)" : ""}`);
          } else {
            existingCaptainProfiles++;
            console.log(`                  = captain_profile (already exists)`);
          }
        } else {
          const inserted = await ensureCrewProfile(id, person, DRY_RUN);
          if (inserted) {
            newCrewProfiles++;
            const roleNote = person.defaultCrewRole ? ` (default: ${person.defaultCrewRole})` : "";
            console.log(`                  + crew_profile${roleNote}`);
          } else {
            existingCrewProfiles++;
            console.log(`                  = crew_profile (already exists)`);
          }
        }
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      errors.push({ person: fullName(person), reason });
      console.error(`[ERROR]         ${label}  →  ${reason}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Users:            ${newUsers} new, ${existingUsers} existing`);
  console.log(`Captain profiles: ${newCaptainProfiles} new, ${existingCaptainProfiles} existing`);
  console.log(`Crew profiles:    ${newCrewProfiles} new, ${existingCrewProfiles} existing`);
  if (errors.length > 0) {
    console.log(`Errors:           ${errors.length}`);
    for (const err of errors) {
      console.log(`  - ${err.person}: ${err.reason}`);
    }
  } else {
    console.log("Errors:           0");
  }
  if (DRY_RUN) {
    console.log(
      `\nDry run complete (target: ${targetLabel}). Re-run without --dry-run to commit changes.`
    );
  } else {
    console.log(`\nDone (wrote to ${targetLabel}).`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
