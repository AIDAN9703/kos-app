-- 1. Remove the seeded fake reviews and the 20 fake reviewer accounts that
--    database/scripts/seed-reviews.ts created (matched by their exact
--    emails, never a pattern), then reset each boat's rating to what's left.
-- 2. Retire the DAY_REQUEST booking type (MULTI_DAY stays, reserved for
--    multi-day bookings). Postgres can't drop an enum value, so the type is
--    rebuilt; any DAY_REQUEST row becomes REQUEST first.
-- One statement: it applies completely or not at all.
DO $migration$
DECLARE
  fake_emails text[] := ARRAY['ahmed.hassan@email.com', 'amanda.b@email.com', 'carlos.mendoza@email.com', 'chris.a@email.com', 'david.t@email.com', 'diego.silva@email.com', 'elena.volkov@email.com', 'emily.r@email.com', 'fatima.alrashid@email.com', 'jean.dubois@email.com', 'jessica.w@email.com', 'kevin.m@email.com', 'lisa.w@email.com', 'marco.santana@email.com', 'mike.chen@email.com', 'priya.patel@email.com', 'ryan.d@email.com', 'sarah.j@email.com', 'sophie.larsson@email.com', 'yuki.tanaka@email.com'];
BEGIN
  DELETE FROM "review"
  WHERE "reviewer_id" IN (SELECT "id" FROM "user" WHERE lower("email") = ANY (fake_emails));

  DELETE FROM "user" WHERE lower("email") = ANY (fake_emails);

  UPDATE "boat" b SET
    "average_rating" = r.avg_rating,
    "total_reviews" = r.review_count
  FROM (
    SELECT bt."id", avg(rv."rating")::double precision AS avg_rating, count(rv."id")::int AS review_count
    FROM "boat" bt LEFT JOIN "review" rv ON rv."reviewed_boat_id" = bt."id"
    GROUP BY bt."id"
  ) r
  WHERE b."id" = r."id";

  UPDATE "booking" SET "booking_type" = 'REQUEST' WHERE "booking_type"::text = 'DAY_REQUEST';

  ALTER TABLE "booking" ALTER COLUMN "booking_type" DROP DEFAULT;
  ALTER TYPE "BookingType" RENAME TO "BookingType_old";
  CREATE TYPE "BookingType" AS ENUM (
    'REQUEST', 'INSTANT_BOOK', 'EXTERNAL_BOOKING', 'GENERAL_QUOTE', 'BOAT_REQUEST',
    'TERM_CHARTER', 'MULTI_DAY', 'MANUAL', 'MARKETPLACE'
  );
  ALTER TABLE "booking"
    ALTER COLUMN "booking_type" TYPE "BookingType" USING "booking_type"::text::"BookingType";
  ALTER TABLE "booking" ALTER COLUMN "booking_type" SET DEFAULT 'EXTERNAL_BOOKING';
  DROP TYPE "BookingType_old";
END
$migration$;
