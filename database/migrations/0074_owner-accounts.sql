-- Owner accounts and owner payouts (2026-10-16): who a boat belongs to,
-- who KOS pays, and every payout made.
--
-- ONE statement on purpose: the migration runner (neon-http) runs statements
-- one by one with no transaction, and a DO block is all-or-nothing. It
-- creates owner_account (with its Stripe and Zelle payout details), its
-- members, emailed invites and owner_payout, then moves ownership over:
--   * KOS Yachts, the house account, gets every boat a staff login held;
--   * every other owner (a boat, the old owner role, or an owner_profile
--     row) gets an account in their name, with them as its Owner;
--   * each booking records its boat's account.
-- The old boat.owner_id (now optional), booking.boat_owner_id and
-- owner_profile stay until 0075, so the code that's live while this runs
-- keeps working.

DO $migration$
BEGIN
  -- Tables, columns and constraints (as drizzle-kit generated them).
  CREATE TYPE "public"."OwnerAccountKind" AS ENUM('INDIVIDUAL', 'BUSINESS');
  CREATE TYPE "public"."OwnerAccountRole" AS ENUM('OWNER', 'MANAGER');
  CREATE TYPE "public"."OwnerPayoutMethod" AS ENUM('STRIPE', 'ZELLE');
  CREATE TYPE "public"."OwnerPayoutStatus" AS ENUM('PENDING', 'PAID', 'FAILED');
  CREATE TABLE "owner_account_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "OwnerAccountRole" NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_account_invite_token_hash_unique" UNIQUE("token_hash")
);
  CREATE TABLE "owner_account_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "OwnerAccountRole" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_account_member_unique" UNIQUE("owner_account_id","user_id")
);
  CREATE TABLE "owner_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "OwnerAccountKind" DEFAULT 'INDIVIDUAL' NOT NULL,
	"is_house" boolean DEFAULT false NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"payout_method" "OwnerPayoutMethod",
	"zelle_contact" text,
	"stripe_account_id" text,
	"stripe_payouts_enabled" boolean DEFAULT false NOT NULL,
	"stripe_bank_last4" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_account_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
  CREATE TABLE "owner_payout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"method" "OwnerPayoutMethod" NOT NULL,
	"status" "OwnerPayoutStatus" DEFAULT 'PENDING' NOT NULL,
	"stripe_transfer_id" text,
	"failure_reason" text,
	"reference" text,
	"paid_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_payout_stripe_transfer_id_unique" UNIQUE("stripe_transfer_id"),
	CONSTRAINT "owner_payout_amount_positive" CHECK ("owner_payout"."amount_cents" > 0)
);
  ALTER TABLE "boat" ALTER COLUMN "owner_id" DROP NOT NULL;
  ALTER TABLE "boat" ADD COLUMN "owner_account_id" uuid;
  ALTER TABLE "booking" ADD COLUMN "owner_account_id" uuid;
  ALTER TABLE "owner_account_invite" ADD CONSTRAINT "owner_account_invite_owner_account_id_owner_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."owner_account"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "owner_account_invite" ADD CONSTRAINT "owner_account_invite_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "owner_account_member" ADD CONSTRAINT "owner_account_member_owner_account_id_owner_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."owner_account"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "owner_account_member" ADD CONSTRAINT "owner_account_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "owner_payout" ADD CONSTRAINT "owner_payout_owner_account_id_owner_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."owner_account"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "owner_payout" ADD CONSTRAINT "owner_payout_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "owner_payout" ADD CONSTRAINT "owner_payout_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "owner_account_invite_account_idx" ON "owner_account_invite" USING btree ("owner_account_id");
  CREATE UNIQUE INDEX "owner_account_invite_open_idx" ON "owner_account_invite" USING btree ("owner_account_id","email") WHERE "owner_account_invite"."accepted_at" IS NULL;
  CREATE INDEX "owner_account_member_user_idx" ON "owner_account_member" USING btree ("user_id");
  CREATE UNIQUE INDEX "owner_account_one_house_idx" ON "owner_account" USING btree ("is_house") WHERE "owner_account"."is_house";
  CREATE INDEX "owner_payout_booking_idx" ON "owner_payout" USING btree ("booking_id");
  CREATE INDEX "owner_payout_account_idx" ON "owner_payout" USING btree ("owner_account_id");
  CREATE UNIQUE INDEX "owner_payout_one_pending_idx" ON "owner_payout" USING btree ("booking_id") WHERE "owner_payout"."status" = 'PENDING';
  ALTER TABLE "boat" ADD CONSTRAINT "boat_owner_account_id_owner_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."owner_account"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "booking" ADD CONSTRAINT "booking_owner_account_id_owner_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."owner_account"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "boat_owner_account_idx" ON "boat" USING btree ("owner_account_id");
  CREATE INDEX "booking_owner_account_idx" ON "booking" USING btree ("owner_account_id");

  -- The house account.
  INSERT INTO "owner_account" ("name", "kind", "is_house", "contact_email")
  VALUES ('KOS Yachts', 'BUSINESS', true, 'contact@kosyachts.com');

  -- One account per owner who isn't staff.
  CREATE TEMP TABLE owner_map ON COMMIT DROP AS
  SELECT u.id AS user_id,
         gen_random_uuid() AS account_id,
         coalesce(nullif(trim(op.business_name), ''),
                  nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''),
                  u.email) AS name,
         (CASE WHEN nullif(trim(op.business_name), '') IS NOT NULL OR op.business_type = 'COMPANY'
               THEN 'BUSINESS' ELSE 'INDIVIDUAL' END)::"OwnerAccountKind" AS kind,
         u.email,
         u.phone_number
  FROM "user" u
  LEFT JOIN "owner_profile" op ON op.user_id = u.id
  WHERE NOT (string_to_array(coalesce(u.role, ''), ',') && ARRAY['admin', 'broker'])
    AND (EXISTS (SELECT 1 FROM "boat" b WHERE b.owner_id = u.id)
         OR 'owner' = ANY(string_to_array(coalesce(u.role, ''), ','))
         OR op.user_id IS NOT NULL);

  INSERT INTO "owner_account" ("id", "name", "kind", "contact_email", "contact_phone")
  SELECT account_id, name, kind, email, phone_number FROM owner_map;
  INSERT INTO "owner_account_member" ("owner_account_id", "user_id", "role")
  SELECT account_id, user_id, 'OWNER' FROM owner_map;

  -- Boats: their owner's account, or KOS Yachts when a staff login held them.
  UPDATE "boat" b SET owner_account_id = m.account_id FROM owner_map m WHERE m.user_id = b.owner_id;
  UPDATE "boat" SET owner_account_id = (SELECT id FROM "owner_account" WHERE is_house)
  WHERE owner_account_id IS NULL;

  -- Bookings: their boat's account.
  UPDATE "booking" bk SET owner_account_id = b.owner_account_id FROM "boat" b WHERE b.id = bk.boat_id;
END
$migration$;
