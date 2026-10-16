-- Drop schema nothing uses any more (audit 2026-10-16). Run it only once the
-- code that stopped reading these is live: the deployed schema must not list
-- a column the database no longer has.
--
-- ONE statement, so it lands whole. Old internal notes are copied into the
-- deal's activity log (booking_event, where notes live now) before their
-- table goes. Everything else dropped here was never read by the app.

DO $migration$
BEGIN
  INSERT INTO "booking_event"
    ("booking_id", "actor_type", "actor_id", "event_type", "channel", "display_message", "content", "metadata", "created_at")
  SELECT "booking_id", 'admin', "admin_user_id", 'booking.note_added', 'admin_portal',
         'Note (' || "note_type" || ')', "content",
         jsonb_build_object('noteType', "note_type"::text, 'movedFrom', 'booking_admin_note'),
         "created_at"
  FROM "booking_admin_note";

  DROP TABLE "booking_admin_note" CASCADE;
  DROP TABLE "notification" CASCADE;
  DROP TYPE "public"."AdminNoteType";

  ALTER TABLE "boat" DROP CONSTRAINT "boat_primary_captain_user_id_user_id_fk";
  DROP INDEX "boat_captain_idx";
  DROP INDEX "boat_ranking_idx";
  ALTER TABLE "boat"
    DROP COLUMN "search_ranking_score",
    DROP COLUMN "virtual_tour_url",
    DROP COLUMN "weekly_rate",
    DROP COLUMN "monthly_rate",
    DROP COLUMN "primary_captain_user_id",
    DROP COLUMN "max_rental_days",
    DROP COLUMN "last_maintenance_date",
    DROP COLUMN "next_maintenance_date",
    DROP COLUMN "maintenance_notes";

  ALTER TABLE "user"
    DROP COLUMN "birthday",
    DROP COLUMN "identity_verified",
    DROP COLUMN "identity_verification_type",
    DROP COLUMN "default_payment_method_id";

  ALTER TABLE "booking_group" DROP COLUMN "notes";

  ALTER TABLE "booking"
    DROP COLUMN "cold_at",
    DROP COLUMN "legacy_inquiry_id",
    DROP COLUMN "allow_payment",
    DROP COLUMN "payment_type",
    DROP COLUMN "accepted_at",
    DROP COLUMN "accepted_customer_note",
    DROP COLUMN "expires_at";

  ALTER TABLE "booking_pricing"
    DROP COLUMN "tax_amount_cents",
    DROP COLUMN "discount_amount_cents",
    DROP COLUMN "discount_code",
    DROP COLUMN "deposit_due_date",
    DROP COLUMN "remainder_due_date";

  ALTER TABLE "booking_ops"
    DROP COLUMN "revenue_cents",
    DROP COLUMN "balance_owner_cents",
    DROP COLUMN "balance_client_cents",
    DROP COLUMN "crew_name",
    DROP COLUMN "contract_signed",
    DROP COLUMN "connected",
    DROP COLUMN "captain_paid",
    DROP COLUMN "all_paid",
    DROP COLUMN "sheets_sent";

  ALTER TABLE "payment" DROP COLUMN "stripe_invoice_id";
END
$migration$;
