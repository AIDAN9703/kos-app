-- Legacy auth leftovers, unused since Better Auth (0065): the Auth.js user
-- columns (sign-in methods live in "account", roles in user.role), the old
-- Twilio "verification" table, and their enum types. One statement, so it
-- applies completely or not at all.
DO $migration$
BEGIN
  DROP TABLE IF EXISTS "verification" CASCADE;
  DROP INDEX IF EXISTS "is_admin_idx";
  ALTER TABLE "user"
    DROP COLUMN IF EXISTS "password",
    DROP COLUMN IF EXISTS "is_admin",
    DROP COLUMN IF EXISTS "auth_provider",
    DROP COLUMN IF EXISTS "provider_account_id";
  DROP TYPE IF EXISTS "public"."AuthProvider";
  DROP TYPE IF EXISTS "public"."VerificationChannel";
  DROP TYPE IF EXISTS "public"."VerificationStatus";
  DROP TYPE IF EXISTS "public"."VerificationType";
END
$migration$;
