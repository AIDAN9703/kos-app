ALTER TABLE "boat" ALTER COLUMN "turnaround_minutes" SET DEFAULT 30;--> statement-breakpoint
-- Existing boats still carry the old default. Nothing in the app sets
-- turnaround per boat, so every 60 is the old default: move them to 30.
UPDATE "boat" SET "turnaround_minutes" = 30 WHERE "turnaround_minutes" = 60;
