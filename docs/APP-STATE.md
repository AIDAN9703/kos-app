# KOS App — State of the System

_Last verified: 2026-08-14 (against the codebase and both databases)._
Update the date when you re-verify. Claims here were checked, not assumed.

---

## Architecture

**Stack:** Next.js 16 (App Router, RSC + server actions) · TypeScript · Drizzle ORM on
Neon Postgres · NextAuth · Stripe Checkout · Resend (email) · Twilio (OTP) ·
ImageKit (media) · Google Maps/Places · shadcn/ui + Tailwind v4 · react-query + nuqs.

**Layering:** `app/` routes → `features/*/actions` (server actions, Zod-validated) →
`features/*/services` (DB access) → `database/schema`. Shared UI/helpers in `shared/`.

**Features:** bookings, boats, availability, payments, users, profiles, listing,
search, blog, add-ons, auth, admin, booking-groups, app-settings, `_marketing`.

### Three conventions that matter

1. **One bookings table, one vocabulary.** An `INQUIRY` row is UPGRADED IN PLACE to
   `PROPOSED` → `BOOKED` → `COMPLETED` (`CANCELLED` off to the side). Same id, same
   history — never a second row. Payment (unpaid / deposit paid / paid) is a label
   derived from the payments ledger, never a status. `BOOKED` is the one status that
   blocks the calendar. (Migration 0060 retired DRAFT / PENDING / APPROVED / CONFIRMED.)
2. **Guest-first.** `bookings.userId` is nullable; every booking carries its own
   contact snapshot. Customers inquire, accept, and pay without an account.
3. **Money in cents** everywhere; dollars only at the display edge.

### Hard constraints

- **No transactions.** The Neon HTTP driver throws on `db.transaction()`. All
  multi-step writes are sequential and must be idempotent.
- **Availability is enforced by a Postgres exclusion constraint**, so double-booking
  is impossible regardless of which code path writes.
- **Charter times are stored as absolute instants** (timestamptz) and displayed in
  the BOAT's timezone. See the timezone section below.

---

## Data reality

| | Prod | Dev |
|---|---|---|
| Boats | 272 | 223 |
| Users | 359 | 307 |
| Bookings | 239 (94 inquiry, 63 confirmed) | 199 |
| Succeeded payments | 5 | 10 |
| Charter parties | 0 | test data only |

**Boat timezones (after the 2026-08-14 backfill):**

| Zone | Prod | Dev |
|---|---|---|
| America/New_York | 215 | 192 |
| Europe/Athens (Mykonos) | 24 | 0 |
| America/Nassau | 8 | 8 |
| America/Chicago | 7 | 7 |
| America/Santo_Domingo | 5 | 5 |
| Asia/Singapore | 1 | 1 |
| **unset** | **12** | **10** |

Unset boats fall back to America/New_York. Prod's remaining 12: 2 at La Coloma Marina
(location ambiguous) and 10 with no location label — both awaiting the owner's call.

---

## What works

- **Marketing site** — 30+ public routes in one brand voice: landing, about, careers,
  yacht club, contact, experiences ×5, services ×5, FAQ, legal, news/blog (98 posts).
- **Testimonials** — live Google reviews via Places API v1 (5.0 / 130 reviews).
- **Boat discovery** — search with map + filters, boat detail, pricing tiers, add-ons,
  availability calendar.
- **Inquiry intake** — landing general inquiry, term-charter inquiry, boat-page inquiry
  (account-gated with in-page auth modal). All land as `INQUIRY` on the board.
- **Proposal → payment → confirmation** (verified end to end): price an inquiry →
  branded proposal email → public proposal page (accept / request changes) → Stripe
  Checkout → payment settles → confirmation email → branded success page.
- **Boat-local charter times (input AND display)** — what an admin types is the boat's
  wall clock, never the browser's, so booking a Miami charter from anywhere stores the
  Miami hour; every surface (proposal page, emails, board, detail page) displays
  boat-local with a zone label. Verified across New York / Chicago / Nassau /
  Santo Domingo, including the no-DST Santo Domingo case.
- **Charter parties (multi-boat)** — one group, a row per boat, one proposal link, one
  Stripe session with per-boat line items, one payment row per boat, webhook/verify
  confirm every boat, full refunds cancel the whole party. Board shows a violet
  "×N party" badge; detail page has a Charter Party card.
- **Admin** — bookings board (money columns, status emblems, filters, assignment),
  unified booking detail page, dashboard, calendar, boats/users/captains/crew/add-ons/
  blog/settings CRUD.
- **Auth** — email/password, Google OAuth, phone OTP; guest checkout throughout.
- **Customer profile (`/profile`, rebuilt 2026-09-16)** — site header + left rail (identity
  card, stacked nav, owner/captain entries by role). Overview: to-do cards (proposal to
  review, payment due, missing phone/photo), next-trip hero with countdown, other upcoming
  trips, past trips ("My trips"), latest blog posts as cards. Trips: "Upcoming" reservation
  cards + "Past" tiles, one shared elevation style (`features/profile/components/surface.ts`); trip detail with boat-local times, payment card, customer-scoped Pay (only while
  nothing is paid — checkout can't charge a remainder), proposal link, Stripe portal.
  Settings: inline row editing, photo upload, notification preferences (real columns),
  change password (email accounts), sign out. Owner/captain pages show real fleet /
  assignment data. Favorites page removed (no favorites table; boat-card heart is
  local-only state). All code in `features/profile/` — no React Query, no `/api/users/profile`.

---

## What's broken or incomplete

**🟡 12 prod boats still have no timezone** (2 "La Coloma Marina", 10 with no location
label) and so fall back to America/New_York. Needs the owner to say where they are;
set them with `scripts/backfill-boat-timezones.sql` as a template.

**🟠 Boat-page inquiry sends no acknowledgment email.** Only general + term-charter do.

**🟠 Legacy REQUEST flow undecided.** Approve/deny emails still use the old template.

**🟢 SMS.** Proposal / payment-link texts go out through Twilio (on create and on
resend); OTP too. GoHighLevel is disconnected (2026-09-04), so Twilio is the only
SMS sender and the "two phone numbers" problem is gone with it.

**🟡 Party editing incomplete.** Can't add/remove a boat after creation; group name is
auto-generated and not editable; partial refunds record against the lead booking only.

**🟡 Google Maps loads via `window.google` polling** instead of a proper provider.

**Not built:** contract e-signature, Google Calendar push to captains, QuickBooks sync,
owner-payout automation, customer-submitted reviews (the 577 `review` rows are seed data;
real testimonials come from Google).

**Tech debt:** repo-wide lint sits at 255 problems (136 errors / 119 warnings) — all
pre-existing: refs-during-render in AdminBookingsCalendar, set-state-in-effect in
PaymentSuccessClient, and `any` types across several services.

**Dependencies:** `npm audit` is clean of high severities. 4 moderates remain, all in
drizzle-kit / esbuild dev tooling; the only "fix" npm offers is a breaking downgrade to
drizzle-kit@0.18.1, and the esbuild issue affects the local dev server only — not
production. Leave them unless drizzle-kit is upgraded for other reasons.

---

## Business rules worth knowing

- **Revenue = GMV − owner payout.** Fuel/crew/dockage expense lines are tracked but do
  NOT reduce KOS revenue (see `shared/lib/utils/ops-revenue.ts`). Deliberate; matches the
  team's spreadsheet. Change it knowingly or not at all.
- **GMV is derived server-side per boat** (`pricing total − card fee`). The client cannot
  submit a GMV. Party financials are per booking, never pooled onto the lead.
- **Emails** all render from one shared brand shell (logo header, photo backdrop,
  contact@kosyachts.com footer) in `shared/lib/services/email.service.ts`.

---

## Before deploying

1. Set `ADMIN_ALERT_EMAIL` in Vercel (comma-separated) — the team-alert inbox. Falls
   back to contact@kosyachts.com when unset.
2. Confirm the Stripe webhook is registered for the prod domain — **refunds only sync
   via webhook**; the verify fallback covers checkout only.
3. Decide the SMS provider question.
4. Set timezones on the last 12 boats (2 La Coloma, 10 unlabelled) once their
   locations are known.

**Money semantics (fixed 2026-08-19):** `booking_ops.expense_cents` aggregates
ALL expense lines (owner payout + fuel/crew/dockage), so REV = GMV − every
cost. Effective GMV falls back to quote total − service fee (fee-exclusive)
on revenue/GMV surfaces; client-balance surfaces keep the fee-inclusive total
because that's what the client owes. Backfill: scripts/backfill-expense-totals.sql.

**Prod data reset (2026-08-19):** 227 test-era bookings (created before
2026-07-15) + 15 test/orphaned payment rows deleted ahead of the go-live;
14 real bookings kept. Backup tables were dropped 2026-09-07 on the
owner's call — history starts at the mid-July real-era rows, period. The legacy
REQUEST flow is retired end to end (producer, approve/deny, emails); its two
real stranded customers (Conor Horrigan, Jason Vonick) were converted to
INQUIRY and need human follow-up. Deal language: INVOICE_SENT split into
PROPOSAL_SENT / ACCEPTED — pipeline reads Inquiry → Contacted → Proposal
sent → Accepted → Partial payment → Payment complete → Completed.

**KOS Command — admin AI assistant (2026-09):** `/admin/assistant`, route
`app/api/admin/assistant`, tools in `features/admin/assistant/tools.ts`.
Vercel AI SDK v7 + `@ai-sdk/anthropic` + Claude Opus 5, streaming, read-only:
six tools that wrap the existing admin service layer (search/detail/revenue/
departures/action queue/fleet). Admin-gated like every server action; the
model never touches the DB. `maxOutputTokens` is capped at 4096 on purpose —
Anthropic pre-authorizes credit against max_tokens, and the SDK default (128K)
trips small balances. Requires `ANTHROPIC_API_KEY` (Vercel env + .env.local).
Phase 2 (write actions behind confirmation) not started; when it is, treat
customer-supplied text in tool results as untrusted (prompt injection).

**Money model (2026-09-02):** `features/bookings/lib/booking-money.ts` is the ONE
place for money math — `customerMoney()` (subtotal / card fee / effective total /
paid / balance / status) and `dealEconomics()` (GMV / expenses / revenue /
commission). `booking_pricing.service_fee_waived` (migration 0059, applied dev +
prod) marks off-card payments: the fee stays stored, the effective total drops it,
so a Zelle payer reads "Paid" instead of owing 3.5% forever. Stripe checkout
refuses a waived booking (collect manually or un-waive). Booking page: the
ProposalPanel (customer's exact breakdown + online-payment switch + send
email/text + copy link) sits above Activity; DealEconomicsCard holds GMV/
expenses/revenue + payment ledger + Record payment (method picker, fee-waive).
Manual payments record method in `payment_method_detail`.

**Admin-flow cleanup (2026-09-04)** — first pass before handing the admin to the team:
- **GoHighLevel removed entirely.** Service deleted, every webhook call gone
  (3 web intakes, instant booking). Nothing syncs to GHL any more.
- **Team alert emails** (`sendAdminAlertEmail` in email.service, `alertTeam` in
  `features/bookings/lib/team-alerts.ts`) to `ADMIN_ALERT_EMAIL` on: new inquiry
  (home/contact, term charter, boat page, marketplace), customer requested changes,
  proposal accepted (only on a real DRAFT→APPROVED flip), payment received (checkout
  webhook, invoice, verify fallback), instant booking created (loud when it landed on a
  conflicting slot). Plain internal template, "Open in admin" deep link, never throws.
- **Availability gate at proposal creation.** `createBookings` resolves every boat's
  window and asserts it against APPROVED/CONFIRMED bookings, owner blocks and external
  calendars BEFORE any write (no transactions), with a per-boat message. Same gate in
  `addBoatToParty`. A proposal can no longer be sent for a sold slot.
- **Contact details editable** at every stage: ⋯ → "Edit contact details" (name /
  email / phone, audited through the single-field update). Phone can be corrected but
  not blanked.
- **Boat swap keeps add-ons in the total** (`applyBoatIdChange` passed 0 add-on cents
  and silently dropped them).
- **Proposal sends on create are awaited**; the composer toast says which channel
  failed and the timeline logs it. Copy no longer calls an unsent booking a "draft".
- **Status follows the money on off-card payments.** Recording a Zelle/wire/cash
  payment on a DRAFT proposal checks the slot, then moves it to APPROVED (calendar
  blocked); paid in full moves it to CONFIRMED and sends the customer confirmation.
  Before this a Zelle-paid trip stayed DRAFT forever — never blocking the calendar,
  never completable. Interim until the status-vocabulary rebuild.
- **Board row "Delete" removed** (it was a hard delete on any status, orphaning payment
  rows). Archive / Cancel / Mark lost are the parking verbs. Dead hook + action deleted;
  `bookingService.deleteBooking` kept for scripts.
- **Contract readiness dropped** from trip-readiness, the board emblem and the list
  type — nothing could ever set `booking_ops.contract_signed`, so every trip showed a
  permanent "Contract" gap. Column stays in the DB for when e-signature exists.
- Still open (agreed direction, not built yet): admin "mark booked" verb + status
  vocabulary rebuild (retire DRAFT / PENDING / accept-vs-confirm), price editing after
  creation, contact-only "save as inquiry", customer vs user model, customer lifecycle
  emails.

**Status vocabulary rebuild (2026-09-04, migration 0060 — NOT YET APPLIED to dev or
prod):** stored statuses are now INQUIRY / PROPOSED / BOOKED / COMPLETED / CANCELLED.
DRAFT and PENDING became PROPOSED; APPROVED and CONFIRMED became BOOKED; the
no-overlap constraint fires on BOOKED only; `booking_status_history` remapped too.
Code is already on the new words, so **apply 0060 to dev before running the app, then
to prod before deploying** (`npm run db:migrate:dev` / `:prod`; pre/post-flight queries
are in the file). Derived pipeline: Inquiry → Contacted → Proposal → Booked → Paid →
Completed. One "booked" verb everywhere (`bookingStatusService.markBooked`): the
customer accepting, an admin's ⋯ → "Mark as booked" (checks the slot, books the whole
party), or a recorded payment. Old event payloads still carry the old words; the
timeline reads them through `canonicalBookingStatus` in `deal-status.ts` — the ONLY
place the retired names exist. "Draft" is gone from code and copy: the public link is
`/bookings/proposal/[token]` (`/bookings/draft/…` permanently redirects for links
already in customers' inboxes); components live in `features/bookings/components/
proposal/`, actions in `actions/proposal.actions.ts`, email is `sendProposalEmail`.
Instant-book overlap holds (paid, but the slot sold during checkout) land as PROPOSED
with the warning note + team alert instead of the retired PENDING.

**Booking page layout (2026-09-04, round 4):** `/admin/bookings/[id]` is one template
for every stage. Left column: header (booking number, name + colored kind chip, a
"Created X ago" line, [primary verb][Edit trip][⋯] + Resend on the right, stage-aware
headline money, and a full-width, left-flush contact row underneath: Email · Phone ·
**Assigned to** on one line),
then ONE Trip details card (row 1 Boat · Captain · Crew with live assignment controls;
row 2 From · To; row 3 Passengers · Captain needed · Pickup · Drop-off), then
Commission (charter value · expenses · commission split · KOS keeps), then Charter
party when applicable. Right column: Finances (customer line items → total / paid /
balance, compact payment rows that open in Stripe; Add expense + Record payment in its
header) above the sticky Activity rail. "Edit trip" turns the trip fields AND the
header's contact row into forms; "Done" saves both. Inquiries show the same header
("Edit contact"), "Trip details · Requested", and Finances with the estimate. No status
stepper or status chip on the page, by Aidan's call.
