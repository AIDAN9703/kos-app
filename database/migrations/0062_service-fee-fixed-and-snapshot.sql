ALTER TABLE "app_setting" ALTER COLUMN "service_fee_bps" SET DEFAULT 399;--> statement-breakpoint
ALTER TABLE "booking_pricing" ADD COLUMN "service_fee_bps" integer;--> statement-breakpoint
ALTER TABLE "booking_pricing" ADD COLUMN "service_fee_fixed_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN "service_fee_fixed_cents" integer DEFAULT 99 NOT NULL;--> statement-breakpoint
-- New card fee: 3.99% + $0.99 per booking (applies to bookings priced from now on).
UPDATE "app_setting" SET "service_fee_bps" = 399, "service_fee_fixed_cents" = 99, "updated_at" = now();--> statement-breakpoint
-- Snapshot the rate every existing booking was priced at, so its open
-- proposal keeps the fee the customer was quoted (no fixed part back then).
UPDATE "booking_pricing"
SET "service_fee_bps" = round("service_fee_cents" * 10000.0 / ("total_amount_cents" - "service_fee_cents"))
WHERE "service_fee_bps" IS NULL
  AND "service_fee_cents" IS NOT NULL
  AND "total_amount_cents" - "service_fee_cents" > 0;--> statement-breakpoint
ALTER TABLE "booking_pricing" ADD CONSTRAINT "booking_pricing_service_fee_bps_range" CHECK ("service_fee_bps" IS NULL OR "service_fee_bps" BETWEEN 0 AND 10000);--> statement-breakpoint
ALTER TABLE "booking_pricing" ADD CONSTRAINT "booking_pricing_service_fee_fixed_nonneg" CHECK ("service_fee_fixed_cents" >= 0);
