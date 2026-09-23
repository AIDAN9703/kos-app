# Owner marketplace audit — can KOS be Boatsetter AND a concierge?

_Audited 2026-09-22 against the codebase (schema, actions, Stripe layer, owner surface, docs)._

## 1. Verdict in one paragraph

The schema is not wrong; it is one-sided. It was built — deliberately, per
`docs/CHARTER_DATA_MODEL_AND_OPERATIONS.md` ("Payouts later") — as a **concierge
system where KOS is the merchant of record and the boat owner is a cost line**. The
marketplace half (owner lists a boat, approves requests, gets paid out) exists today only
as dead columns, a dangling enum value, and marketing copy. Nothing needs to be torn up:
the one-`bookings`-table spine, the Postgres exclusion constraint, the `payments` ledger,
guest-first bookings and cents-everywhere are the right foundations and every marketplace
piece can hang off them. What is missing is a second layer: a listing lifecycle, owner
economics as a contracted rate snapshotted per booking, an approval state, a payout ledger,
Stripe Connect onboarding, an owner write surface, and owner notifications.

## 2. What exists today (mode B — concierge)

- Leads land as `INQUIRY` rows from public forms and marketplace emails; admins price them
  in the composer (`features/bookings/actions/create-booking-full.actions.ts`) → `PROPOSED`
  with a `publicToken`; customer accepts and pays via Stripe Checkout; webhook + verify
  flip the row to `BOOKED`. Solid, verified end to end (see `APP-STATE.md`).
- Instant book (`boats.instantBook`) is the same inventory sold without a human: Stripe
  Checkout first, booking row created at the webhook. The owner is a foreign key
  (`bookings.boatOwnerId`) and an `OWNER_PAYOUT` expense line — never a counterparty.
- Owner money = `bookingOps.sentToOwnerCents` (a mutable scalar, no history) +
  `bookingExpenseLines(OWNER_PAYOUT)` (delete-then-reinsert on every save, so history is
  destroyed). Default owner payout is a flat per-tier dollar amount
  (`boatPricingTiers.ownerPayoutCents`). **No commission rate is stored anywhere**, while
  marketing promises 15–40%.

## 3. Findings, ranked by how much they block the goal

### 3.1 Owners cannot be created without SQL — blocks admin AND self-serve
- `boats.ownerId` is required (`features/boats/boat.validation.ts`) and the admin owner
  picker only lists users with an `owner_profile` row
  (`features/profiles/owner-profile.service.ts`), but **no code path inserts into
  `ownerProfiles`**. Captains and crew have admin "promote" actions
  (`features/users/promote-user.actions.ts`); owners do not.
- `isOwner` is baked into the JWT (`auth.ts`), so a future promote action must force a
  token refresh or the owner keeps getting redirected off `/profile/owner`.

### 3.2 No self-serve listing flow at all
- Every boat write is admin-gated: `features/boats/boat.mutations.ts`, the admin boat form,
  `app/api/admin/boats/*`, and boat image uploads (`app/api/upload/route.ts`, 403 unless
  admin). `features/listing/` is the public boat *detail* page, not a listing flow.
- The funnel dead-ends: "List your boat" (header menu, footer) →
  `/services/charter-management` → contact form → human → SQL → admin form → tick `active`.
- No earnings estimator exists. There is enough data to build one (272 boats with pricing
  tiers by category/length/location), but nothing computes it.

### 3.3 Listing lifecycle is one boolean
- `boats.active` is the only state: invisible or live. No draft, submitted, in review,
  approved, rejected, archived; no submitted/reviewed-by/at audit.
- `updateBoatSchema = boatBaseSchema.partial()` permits `active`, `featured`,
  `featuredOrder`, `searchRankingScore`, `ownerId`. The moment an owner can call an
  update, this is a privilege-escalation surface unless those fields are stripped.
- Quality bar at create is weak: photos, pricing tiers and location are optional; the admin
  form pre-fills `lengthFt: 1`, `capacity: 1`, `features: ["Standard features"]`.

### 3.4 Owner approval does not exist — but the public UI promises it (bug today)
- `bookingStatusEnum` deliberately dropped the approval state in migration 0060
  (`APPROVED + CONFIRMED → BOOKED`). `bookingType REQUEST` ("needs approval") is never
  created. `boats` has `instantBook` only — no `requiresOwnerApproval`, response window,
  or auto-decline.
- Yet `features/listing/components/sub-components/BookingDetails.tsx` renders "Owner
  approval required", `booking-form/v2/BookingForm.tsx` says "sends a booking request to
  the owner… you'll only be charged if the request is approved", and
  `BookingRequestSuccess.tsx` says "once it's approved". In reality the request is an
  `INQUIRY` only KOS admins see. This is a correctness bug independent of marketplace work.

### 3.5 Stripe Connect is schema-only; there is no payout model
- `ownerProfiles.stripeConnectAccountId / stripeConnectOnboarded / payoutsEnabled /
  pendingPayoutCents / lifetimePayoutCents` are written by nothing and read by nothing
  except a type picker. No `accounts.create`, no `accountLinks`, no `transfer_data`, no
  `application_fee_amount`, no `account.updated` / `payout.*` / `transfer.*` webhook events.
- Every charge lands 100% in the KOS platform balance
  (`features/bookings/actions/stripe-checkout.ts`). Multi-boat charter parties charge N
  boats (potentially N owners) in one session — destination charges can't split that;
  separate charges + transfers can.
- No `payout`/ledger table. `payments.payableType` is `BOOKING` only. Refunds cancel the
  booking but never claw back `sentToOwnerCents`. Nothing calls `stripe.refunds.create`;
  refunds are dashboard-initiated and synced inbound.
- ~20 denormalised owner counters on `ownerProfiles` (acceptance rate, response rate,
  revenue…) have no writer — anything that renders them shows fabricated zeros.

### 3.6 Owner has no surface and no channel
- Owners cannot edit a boat, change a price, block dates (`boatBlocking` has readers but
  **no writer anywhere**), accept a request, or see any money. `/profile/owner` is a
  read-only fleet list (built 2026-09-16).
- No owner notification exists. `features/notifications` does not exist; the
  `notifications` table is never written; every alert goes to `ADMIN_ALERT_EMAIL`.
- `bookings.boatOwnerId` is populated on all modern write paths but has no index and no
  owner-scoped query uses it (only the ICS feed, whose URL is never issued to owners).

### 3.7 Payment-layer risks worth fixing regardless
- Webhook accepts **both** test and live signing secrets (`app/api/webhook/stripe/route.ts`)
  — a production endpoint will accept test-mode events.
- `/api/stripe/verify` is unauthenticated; anyone with a `cs_…` id can trigger
  confirmation emails and status flips (Stripe is consulted, so blast radius is limited).
- No event-id idempotency table; webhook and verify race by design and can double-send
  confirmations.
- `charge.dispute.created` is not handled — `CHARGEBACK` status is unreachable; a disputed
  booking still looks paid.
- Expense-line save is delete-then-insert without a transaction (Neon HTTP has none); a
  crash zeroes a booking's owner payout and inflates REV.
- Partial refunds on charter parties are booked against the lead boat only.
- `ownerProfiles.taxId` is commented "(encrypted)" and is plain text.

### 3.8 Stale vocabulary and docs
- `bookingType REQUEST` is a dangling enum value; `CHARTER_DATA_MODEL_AND_OPERATIONS.md`
  still describes the pre-0060 status set and a separate `inquiry` table that was never built.
- `bookingType MARKETPLACE` and sources `BOATSETTER/GETMYBOAT` mean **inbound leads from
  those sites**, not KOS acting as a marketplace. Keep that meaning; don't overload it.

## 4. How both modes can be true at once (recommended shape)

The deciding question per boat is **who is the merchant and who sets the price**. Model it
explicitly instead of inferring it from `instantBook`:

| | Concierge (KOS-managed) | Marketplace (owner-operated) |
|---|---|---|
| `boats.supplyMode` | `KOS_MANAGED` | `OWNER_OPERATED` |
| Who prices | admin (composer, tiers) | owner (tiers), KOS adds fee |
| Who approves | admin (`PROPOSED` → `BOOKED`) | owner, within a response window |
| Merchant of record | KOS | KOS (platform), owner paid via Connect transfer |
| Owner economics | contracted payout per tier (`ownerPayoutCents`), snapshotted at commit | commission rate (bps) on boat/owner, snapshotted at commit |
| Payout | recorded in the same `payouts` ledger, method `MANUAL` | `payouts` row → Stripe transfer to Express account |

Everything below the boat level stays shared: one `bookings` table, one `payments`
ledger, one exclusion constraint, one detail page, one timeline. Admins keep full control
of both kinds (they can still price, propose, mark booked, refund, pay out) — the
marketplace layer adds owner permissions, it does not remove admin ones.

Design choices to make deliberately:
- **Approval state.** Add `REQUESTED` (customer asked, owner must answer by
  `ownerResponseDeadline`) to `bookingStatusEnum`, include it in the exclusion constraint so
  a request holds the slot, and expire it with a sweep (cron). This is the state migration
  0060 removed; bring it back on purpose, with owner semantics, not admin ones. Cancel/decline
  releases the hold.
- **Economics snapshot.** Add `ownerPayoutCents` and `commissionBps` (or `kosFeeCents`) to
  `bookingPricing`, written at commit exactly like `serviceFeeCents` already is. Reports read
  the snapshot, never the live rate.
- **Connect topology.** Use **separate charges and transfers** (not destination charges):
  charter parties can span owners, KOS needs to hold funds until the trip completes or a
  dispute window passes, and concierge boats need no transfer at all. Express accounts,
  KOS as platform.
- **Listing lifecycle.** Replace the meaning of `active` with a `listingStatus` enum
  (`DRAFT → SUBMITTED → APPROVED → LIVE / REJECTED / ARCHIVED`) plus `submittedAt`,
  `reviewedByUserId`, `reviewedAt`, `rejectionReason`. Keep `active` as the derived
  "publicly visible" flag if search code depends on it.

## 5. Phased plan

**Phase 0 — stop lying, fix the money risks (small)**
- Remove or gate the "owner approval" copy in the public booking form until the flow exists.
- Add an admin "Promote to owner" action + owner-profile creation (mirror captain/crew);
  refresh the JWT flags after promotion.
- Webhook: accept only the environment's secret; add a `stripe_events` idempotency table;
  require `auth()` or a signed token on `/api/stripe/verify`; handle `charge.dispute.created`.
- Delete or wire the dead `ownerProfiles` counters; decide on `REQUEST` enum value.

**Phase 1 — self-serve listing (the Boatsetter front door)**
- Public `/list-your-boat`: estimate step (category, length, location, weekends) → earnings
  range computed from existing tier data for comparable live boats → "Continue" → sign-up
  (or sign-in) → boat saved as `DRAFT` owned by the new user, `ownerProfiles` row created,
  `supplyMode = OWNER_OPERATED`.
- Owner-scoped boat mutations with a strict field allowlist; open `type: "boat"` uploads to
  the boat's owner; multi-step owner editor (details, photos, pricing, availability, rules).
- Admin review queue on `/admin/boats` (filter by `listingStatus`), approve/reject with
  reason, go live.

**Phase 2 — owner economics and visibility**
- `supplyMode`, `commissionBps` / payout model on boats; snapshot to `bookingPricing`.
- Owner dashboard shows per-trip payout, pending vs paid, statements; index
  `bookings.boatOwnerId`.
- Owner can block dates (first writer for `boatBlocking`).

**Phase 3 — Stripe Connect and the payout ledger**
- `payouts` table: payee type + user, booking ids, amount, status, method
  (`STRIPE_TRANSFER | MANUAL`), Stripe transfer/payout ids, initiated by/at, paid at,
  reversal link. Migrate `sentToOwnerCents` into it; concierge manual payouts use the same
  table.
- Express onboarding (`accounts.create`, `accountLinks`), `account.updated` sets
  `payoutsEnabled`; transfers after trip completion; `transfer_reversals` on refunds;
  handle `payout.paid / payout.failed`.

**Phase 4 — owner-mediated requests**
- `REQUESTED` status, response deadline, owner accept/decline actions, expiry cron.
- Owner notifications (email + SMS) for new request, expiring request, booked, paid out;
  first writer for the `notifications` table.

## 6. What to keep exactly as is
One bookings table with in-place upgrades; payments as the only source of "paid";
exclusion-constraint availability; boat-local times; guest-first bookings; the composer
and proposal flow as the concierge tool. Build the marketplace on top of these, not beside them.
