# KOS — what's left to do

The parked list, in rough priority order. `docs/APP-STATE.md` describes how things
work today; this file is what we've decided to do later. Last updated 2026-10-06.

---

## 1. Do soon (small, you can do most of these yourself)

### Update the live Stripe webhook's events — **needed for refunds and disputes to reach the app**
The code that handles refunds and disputes is live, but Stripe only sends the events a
webhook is subscribed to, and the live one isn't subscribed to these yet.

Stripe Dashboard (live mode) → Developers → Webhooks → the endpoint
`https://www.kosyachts.com/api/webhook/stripe` → **Edit destination** → events. Keep:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Add:

- `charge.refunded`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `charge.dispute.created`
- `charge.dispute.closed`

Remove the six `payment_intent.*` events; the app doesn't use them.

### The test-mode webhook that points at the live site
Stripe has two separate worlds: **test mode** (fake cards, fake money, for trying things)
and **live mode** (real customers). Each has its own webhooks. Today both the live
webhook and a test-mode webhook send to the same address, `www.kosyachts.com`. So
whenever anyone makes a test payment, Stripe also tells the live site about it.

- **Before 2026-10-06:** the live site accepted those test messages. A fake test payment
  could have confirmed a real booking.
- **Now:** the live site recognises them as test messages, logs them and ignores them, so
  this is no longer dangerous. It's just clutter.

**What to do:** in the Stripe Dashboard, switch to **test mode** → Developers →
Webhooks, and delete the endpoint `https://www.kosyachts.com/api/webhook/stripe`.

**For testing locally:** the Stripe CLI is the tool:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

It forwards test events to your own computer instead.

### Disconnect the old `kostest` Vercel project
A second Vercel project, `kostest`, is connected to the GitHub repo and fails on every
push. Production (`kos-yachts`) is unaffected, but every commit shows a red ✗. In Vercel,
open `kostest` → Settings → Git → Disconnect, or delete the project if nothing uses it.

### Production data
- **Boat map pins:** re-enter any that the old editor wiped. To find them, run
  `SELECT name, updated_at FROM boat WHERE active AND location IS NULL;` on production.
- **Sign-in check:** sign in once on the live site and try "Continue with Google".
- **Commissions backup:** decide whether to keep or delete the Oct 2 backup of the
  removed commissions code. It's in a temporary folder, and a restart can wipe it.

---

## 2. Stripe follow-ups (need a decision first)

### The card fee (3.99% + $0.99) is probably not compliant
Adding a charge for paying by card is called a **surcharge**, and card networks regulate it:

- **Visa:** a surcharge can't be more than 3%, and never more than what the card actually
  costs you. Stripe's US price is 2.9% + 30¢, so 3.99% + $0.99 is over on both counts.
- **Debit and prepaid cards can't be surcharged at all.** Stripe's hosted checkout page
  sets the total before the customer types their card, so we can't tell debit from credit.
  Today debit cards pay the fee too.
- **Notice and disclosure:** you're supposed to tell your card processor 30 days before
  starting, and show the fee clearly up front.
- **Florida:** its anti-surcharge law was struck down in court (2017), but Stripe still
  lists Florida as restricted. That needs a lawyer.

Compliant options:

1. **Build the cost into the price** (most common).
2. **A flat booking or service fee on every booking**, however they pay. That's not a
   surcharge.
3. **A discount for paying by bank transfer.** Florida law explicitly allows this.
4. **A credit-only surcharge**, capped at 3% and at cost, with notice given. This needs a
   custom checkout built on Stripe's newer surcharge feature; the hosted page can't do it.

**Next step:** ask a lawyer, then pick one. Changing the fee touches pricing,
proposals, receipts and the checkout code.

### Upgrade the Stripe library (v18 → v23)
We're on version 18 of Stripe's code library. Stripe releases a new major version roughly
every six months, and the current one is 23. A **breaking change** means some of our code
has to be adjusted, because names and options changed. Nothing is broken today: Stripe
keeps old versions working. But security fixes and new features land on the newer ones.

What changes for us:

- **Checkout payment methods:** instead of naming "card", we pass Stripe's new
  allowed-methods option.
- **Some field names** are different.
- **Node.js version:** Node 20 or newer is required.
- **Webhook:** our webhook has to be moved to the new version in step.

Roughly a day, with a test pass in Stripe test mode. Best done together with the
card-fee change, since both touch checkout.

### Partial refunds and the balance due
Since 2026-10-06, "paid" means money in minus money refunded. Example: a charter costs
$5,000 and the guest paid $5,000.

- **Cancellation:** you refund everything → paid $0, and the booking cancels itself.
  Correct.
- **Goodwill gesture:** you refund $500 after the trip → paid $4,500. The total is still
  $5,000, so the app shows **$500 due**. That's technically right (the price didn't
  change), but it isn't what you mean.

To avoid that, when a refund is really a discount, also lower the booking's price by the
same amount. A better fix would be a "refund as discount" option on the booking page
that does both at once. That's part of the money work in section 5.

### Use Stripe's restricted keys
Stripe now recommends "restricted" API keys (starting with `rk_`) that can only do what
the app needs, instead of the all-powerful secret key. If a key ever leaked, the damage
would be limited. It's a settings change in Stripe plus updating Vercel's environment
variables.

---

## 3. Security and abuse protection
- **Rate limits** on texted sign-in codes, which today are held in memory, so they don't
  survive across Vercel's servers. Also limits on the public inquiry forms, which have
  none, so a script could make us email strangers from kosyachts.com.
- **SMS countries:** restrict texted codes to the countries we serve. That stops SMS
  fraud running up the Twilio bill.
- **A real captcha** (Cloudflare Turnstile) on sign-up and the inquiry forms. The sign-in
  page currently says "protected by reCAPTCHA", which isn't true: add the captcha or
  remove the line.
- **Content Security Policy** header.

## 4. Accounts and staff (Better Auth)
- **Two-step login** required for admins and brokers.
- **Retire the old "status" field.** Deactivating (a Better Auth ban) is live on the
  person's page, and the staff, owner and account pickers skip deactivated people. They
  also still check the old `user.status`, which nothing can change any more. Turn any
  non-ACTIVE statuses into bans with a migration, then drop the checks.
- **"Log in as this customer"** for support, with a log of every use.
- **Audit log:** sign-ins, role changes, bans, impersonations.
- **Customers can delete their own account** (privacy laws expect it).
- **Prompt unverified users** to confirm their email.
- Optional: shorter login sessions for staff, passkeys.

## 5. Safety nets
- **Automated access tests:** every role against every data function, run as a GitHub
  Action on each push.
- **Error monitoring (Sentry)**, so a failed payment or checkout alerts us.
- **Startup check** that every required environment variable is set.

## 6. Cleanup
- **Palette overrides:** `gray-100`, `red-500`, `red-400`, `blue-100` and `light-200`
  in `globals.css` replace Tailwind's default shades with different colours. For example,
  `gray-100` is really a slate-300 tone and `red-500` is an orange. About 70 uses across
  the site; move them to semantic colours page by page as screens are redone.
- Replace the stale `public/sitemap.xml` / `robots.txt` with Next's built-in
  `app/sitemap.ts` and `app/robots.ts`. That also removes the last `npm audit` warnings,
  which come from next-sitemap.

## 7. Bigger projects
- **Money model:**
  - one payment row per Stripe payment, plus a table splitting it across boats (Stripe's
    recommended shape)
  - every price in cents
  - payments linked to bookings with a real foreign key
  - "refund as discount"
- **Owner self-service:** owners edit their boats and calendars, plus Stripe Connect payouts.
- **Teams** (Better Auth organizations), if owner companies or broker agencies become real.
