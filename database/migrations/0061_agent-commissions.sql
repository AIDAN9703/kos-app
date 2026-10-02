ALTER TABLE "user" ADD COLUMN "commission_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "booking_ops" ADD COLUMN "agent_user_id" uuid;--> statement-breakpoint
ALTER TABLE "booking_ops" ADD COLUMN "commission_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "booking_ops" ADD COLUMN "commission_paid_cents" bigint;--> statement-breakpoint
ALTER TABLE "booking_ops" ADD COLUMN "commission_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_ops" ADD CONSTRAINT "booking_ops_agent_user_id_user_id_fk" FOREIGN KEY ("agent_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_ops_agent_user_idx" ON "booking_ops" USING btree ("agent_user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_commission_rate_bps_range" CHECK ("commission_rate_bps" IS NULL OR "commission_rate_bps" BETWEEN 0 AND 10000);--> statement-breakpoint
ALTER TABLE "booking_ops" ADD CONSTRAINT "booking_ops_commission_rate_bps_range" CHECK ("commission_rate_bps" IS NULL OR "commission_rate_bps" BETWEEN 0 AND 10000);--> statement-breakpoint
-- Link legacy free-text agent names (the composer used to store the admin's
-- display name) to that admin's account. Unmatched names stay as agent_code.
UPDATE "booking_ops" o
SET "agent_user_id" = u."id"
FROM "user" u
WHERE o."agent_user_id" IS NULL
  AND o."agent_code" IS NOT NULL
  AND u."is_admin"
  AND lower(trim(concat_ws(' ', u."first_name", u."last_name"))) = lower(trim(o."agent_code"));
