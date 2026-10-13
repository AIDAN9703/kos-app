-- DRAFT 2026-10-08: self-serve "List your boat". Dev only until the owner
-- experience is signed off. 0072 and 0073 build on it, so to drop the draft,
-- remove its columns from the schema and generate a migration that drops them.
CREATE TYPE "public"."BoatListingStatus" AS ENUM('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."BoatManagedBy" AS ENUM('KOS', 'OWNER');--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "managed_by" "BoatManagedBy" DEFAULT 'KOS' NOT NULL;--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "listing_status" "BoatListingStatus" DEFAULT 'APPROVED' NOT NULL;--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "listing_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "listing_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "listing_reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "listing_review_note" text;--> statement-breakpoint
ALTER TABLE "boat" ADD COLUMN "captain_arrangement" text;--> statement-breakpoint
ALTER TABLE "boat" ADD CONSTRAINT "boat_listing_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("listing_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boat_listing_status_idx" ON "boat" USING btree ("listing_status");--> statement-breakpoint
ALTER TABLE "boat" ADD CONSTRAINT "boat_live_requires_approval" CHECK (NOT "boat"."active" OR "boat"."listing_status" = 'APPROVED');