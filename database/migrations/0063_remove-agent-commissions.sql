-- Agent commissions were removed from the app before launch (rebuilt later).
-- Drops everything 0061 added. IF EXISTS keeps this safe on a database where
-- 0061 never ran. The CHECK constraints go with their columns.
ALTER TABLE "booking_ops" DROP CONSTRAINT IF EXISTS "booking_ops_agent_user_id_user_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "booking_ops_agent_user_idx";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "commission_rate_bps";--> statement-breakpoint
ALTER TABLE "booking_ops" DROP COLUMN IF EXISTS "agent_user_id";--> statement-breakpoint
ALTER TABLE "booking_ops" DROP COLUMN IF EXISTS "commission_rate_bps";--> statement-breakpoint
ALTER TABLE "booking_ops" DROP COLUMN IF EXISTS "commission_paid_cents";--> statement-breakpoint
ALTER TABLE "booking_ops" DROP COLUMN IF EXISTS "commission_paid_at";
--> statement-breakpoint
-- GMV was copied from the price at creation and never updated when the price
-- changed. Clear copies that only duplicate the price so GMV follows it;
-- real manual overrides (a different number) are kept.
UPDATE "booking_ops" o
SET "gmv_cents" = NULL
FROM "booking_pricing" p
WHERE p."booking_id" = o."booking_id"
  AND o."gmv_cents" = p."total_amount_cents" - COALESCE(p."service_fee_cents", 0);
