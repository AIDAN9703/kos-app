-- Better Auth: sign-in methods, sessions, tokens and rate limits, plus roles
-- and a display name on "user". Everything runs as ONE statement: the neon-http
-- driver applies a migration statement by statement with no transaction, so a
-- failure halfway would otherwise leave the schema half-changed.
DO $migration$
BEGIN
  -- Better Auth matches emails in lowercase. Two accounts whose emails differ
  -- only by capitalisation must be merged first.
  IF EXISTS (SELECT 1 FROM "user" GROUP BY lower("email") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Some accounts share an email apart from capitalisation. Merge or remove the duplicates first. Nothing was changed.';
  END IF;

  CREATE TABLE "account" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid NOT NULL,
  	"provider_id" text NOT NULL,
  	"account_id" text NOT NULL,
  	"password" text,
  	"access_token" text,
  	"refresh_token" text,
  	"id_token" text,
  	"access_token_expires_at" timestamp with time zone,
  	"refresh_token_expires_at" timestamp with time zone,
  	"scope" text,
  	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "auth_verification" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"identifier" text NOT NULL,
  	"value" text NOT NULL,
  	"expires_at" timestamp with time zone NOT NULL,
  	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "rate_limit" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" text NOT NULL,
  	"count" integer NOT NULL,
  	"last_request" bigint NOT NULL,
  	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
  );

  CREATE TABLE "session" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"token" text NOT NULL,
  	"user_id" uuid NOT NULL,
  	"expires_at" timestamp with time zone NOT NULL,
  	"ip_address" text,
  	"user_agent" text,
  	"impersonated_by" uuid,
  	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "session_token_unique" UNIQUE("token")
  );

  ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

  ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;

  ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;

  ALTER TABLE "user" ADD COLUMN "ban_reason" text;

  ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp with time zone;

  ALTER TABLE "user" ADD COLUMN "name" text DEFAULT '' NOT NULL;

  ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

  ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");

  CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");

  CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");

  CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");

  -- ── Carry every existing account over unchanged ────────────────────────────
  -- Better Auth looks emails up in lowercase (the guard above made sure no two
  -- accounts collide).
  UPDATE "user" SET "email" = lower("email") WHERE "email" <> lower("email");

  UPDATE "user" SET "name" = COALESCE(NULLIF(trim(concat_ws(' ', "first_name", "last_name")), ''), split_part("email", '@', 1));

  -- Roles from what each person is today: the admin flag plus owner, captain
  -- and crew profiles. Everyone else is a customer.
  UPDATE "user" u SET "role" = COALESCE(NULLIF(concat_ws(',',
    CASE WHEN u."is_admin" THEN 'admin' END,
    CASE WHEN EXISTS (SELECT 1 FROM "owner_profile" p WHERE p."user_id" = u."id") THEN 'owner' END,
    CASE WHEN EXISTS (SELECT 1 FROM "captain_profile" p WHERE p."user_id" = u."id") THEN 'captain' END,
    CASE WHEN EXISTS (SELECT 1 FROM "crew_profile" p WHERE p."user_id" = u."id") THEN 'crew' END
  ), ''), 'customer');

  -- Email + password: the same bcrypt hash, so the same password keeps working.
  -- (Google sign-ups stored a plain placeholder, not a hash; those are skipped.)
  INSERT INTO "account" ("user_id", "provider_id", "account_id", "password")
  SELECT "id", 'credential', "id"::text, "password" FROM "user" WHERE "password" LIKE '$2%';

  -- Google: the same Google id, so "Continue with Google" opens the same account.
  -- When a Google Workspace address was renamed, the old code made a second
  -- account for the same Google id; the newest one gets the Google sign-in
  -- (nothing is deleted).
  INSERT INTO "account" ("user_id", "provider_id", "account_id")
  SELECT DISTINCT ON ("provider_account_id") "id", 'google', "provider_account_id" FROM "user"
  WHERE "auth_provider" = 'GOOGLE' AND "provider_account_id" IS NOT NULL
  ORDER BY "provider_account_id", "created_at" DESC;
END
$migration$;
