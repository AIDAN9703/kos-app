// Dev-only demo data for the owner portal review (2026-10-08).
//   npx tsx database/scripts/dev/owner-demo.mts seed   — adds a demo KOS-managed boat + charters for the test owner
//   npx tsx database/scripts/dev/owner-demo.mts clean  — removes everything it added
// Tags: bookings.customer_email = delivered+owner-demo@resend.dev, boat name starts "Demo · ".
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8") // run from the repo root
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);
const DEV = env.DATABASE_URL;
const PROD = env.PROD_DATABASE_URL;
if (!DEV || !PROD || DEV === PROD || !new URL(DEV).hostname.startsWith("ep-gentle-dawn")) {
  throw new Error("Refusing to run: DATABASE_URL is not the known dev database.");
}
const sql = neon(DEV);
const TAG = "delivered+owner-demo@resend.dev";
const OWNER_EMAIL = "owner-listing-test@kosyachts.test";
const mode = process.argv[2];

const [owner] = await sql`select id from "user" where email = ${OWNER_EMAIL}`;
if (!owner) throw new Error("Test owner not found");

if (mode === "clean") {
  const b = await sql`delete from booking where customer_email = ${TAG} returning id`;
  const boats =
    await sql`delete from boat where owner_id = ${owner.id} and name like 'Demo · %' returning id`;
  await sql`update boat set insurance_expiry = null, active = false where owner_id = ${owner.id} and managed_by = 'OWNER'`;
  console.log(`removed ${b.length} bookings, ${boats.length} demo boats`);
  process.exit(0);
}
if (mode !== "seed") throw new Error("seed | clean");

const imgs = (
  await sql`select main_image, gallery_images from boat where active and main_image like 'https://ik.imagekit.io/%' and category = 'YACHT' and length_ft between 55 and 70 limit 1`
)[0];
// Azimut from the make catalog (migration 0072 seeds it); no model.
const [azimut] = await sql`select id from boat_make where slug = 'azimut'`;
const [demo] = await sql`
  insert into boat (name, display_title, category, capacity, active, owner_id, make_id, year_built, length_ft,
    features, main_image, gallery_images, location_label, timezone, managed_by, listing_status, insurance_expiry)
  values ('Demo · 62'' Azimut Flybridge', '62'' Azimut Flybridge', 'YACHT', 13, true, ${owner.id}, ${azimut?.id ?? null}, 2020, 62,
    '{}', ${imgs.main_image}, ${imgs.gallery_images}, 'Miami Beach Marina, Miami Beach, FL', 'America/New_York', 'KOS', 'APPROVED',
    now() + interval '21 days')
  returning id, location_label`;
const [listed] =
  await sql`select id, location_label from boat where owner_id = ${owner.id} and managed_by = 'OWNER' limit 1`;
// The self-listed test boat: live for the review so it shows in the outlook.
if (listed)
  await sql`update boat set active = true where id = ${listed.id} and listing_status = 'APPROVED'`;

type Plan = {
  boat: { id: string; location_label: string };
  dayOffset: number;
  hour: number;
  hours: number;
  price: number;
  status: string;
  paid: boolean;
};
const plans: Plan[] = [];
const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rand = rng(42);
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

// Past year: 2–4 charters a month on the demo boat, ~1 a month on the listed one.
for (let d = -360; d < 0; d += 1) {
  const date = new Date(today.getTime() + d * 864e5);
  const dow = date.getUTCDay();
  const month = date.getUTCMonth();
  const peak = month >= 10 || month <= 4; // Nov–May
  const weekend = dow === 0 || dow === 5 || dow === 6;
  const p = (weekend ? 0.35 : 0.06) * (peak ? 1.4 : 0.7);
  if (rand() < p) {
    const hours = [4, 4, 6, 8][Math.floor(rand() * 4)];
    plans.push({
      boat: demo as never,
      dayOffset: d,
      hour: 15,
      hours,
      price: { 4: 2400, 6: 3200, 8: 4000 }[hours]!,
      status: rand() < 0.05 ? "CANCELLED" : "COMPLETED",
      paid: d < -21,
    });
  } else if (listed && weekend && rand() < 0.12) {
    plans.push({
      boat: listed as never,
      dayOffset: d,
      hour: 16,
      hours: 4,
      price: 2240,
      status: "COMPLETED",
      paid: d < -21,
    });
  }
}
// Ahead: confirmed charters over the next ~10 weeks, mostly weekends.
for (const [d, h, which] of [
  [3, 4, "demo"],
  [4, 6, "demo"],
  [5, 4, "listed"],
  [10, 8, "demo"],
  [11, 4, "demo"],
  [12, 6, "listed"],
  [17, 4, "demo"],
  [25, 6, "demo"],
  [32, 8, "demo"],
  [39, 4, "listed"],
  [46, 6, "demo"],
  [60, 4, "demo"],
] as const) {
  const boat = which === "demo" ? demo : listed;
  if (!boat) continue;
  plans.push({
    boat: boat as never,
    dayOffset: d,
    hour: 15,
    hours: h,
    price: which === "demo" ? { 4: 2400, 6: 3200, 8: 4000 }[h]! : 2240,
    status: "BOOKED",
    paid: false,
  });
}

let n = 0;
for (const p of plans) {
  const start = new Date(today.getTime() + p.dayOffset * 864e5 + p.hour * 36e5);
  const end = new Date(start.getTime() + p.hours * 36e5);
  const payout = Math.round(p.price * 100 * (p.boat === (demo as never) ? 0.7 : 1));
  const [b] = await sql`
    insert into booking (booking_type, booking_status, source, boat_owner_id, boat_id, customer_name, customer_email,
      start_datetime, end_datetime, number_of_passengers, pickup_location, admin_notes)
    values ('EXTERNAL_BOOKING', ${p.status}, 'ADMIN', ${owner.id}, ${p.boat.id}, 'Demo guest', ${TAG},
      ${start.toISOString()}, ${end.toISOString()}, ${6 + Math.floor(rand() * 7)}, ${p.boat.location_label}, 'owner-demo')
    returning id`;
  if (p.status !== "CANCELLED") {
    await sql`insert into booking_expense_line (booking_id, category, amount_cents, label) values (${b.id}, 'OWNER_PAYOUT', ${payout}, 'Owner payout')`;
    await sql`insert into booking_ops (booking_id, sent_to_owner_cents) values (${b.id}, ${p.paid ? payout : 0})`;
  }
  n += 1;
}
console.log(`seeded demo boat ${demo.id} + ${n} charters`);
