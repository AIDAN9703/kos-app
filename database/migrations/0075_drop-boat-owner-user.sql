-- Finish the move to owner accounts (0074): drop boat.owner_id,
-- booking.boat_owner_id, owner_profile and the old "owner" role. Run it only
-- once the code that uses owner accounts is live.
--
-- ONE statement, so it lands whole. Anything the old code saved after 0074
-- ran (a boat with only owner_id, a booking with no account) is linked the
-- same way 0074 linked everything, then the check below refuses to drop
-- anything if a boat would still have no account.

DO $migration$
DECLARE
  house uuid := (SELECT id FROM "owner_account" WHERE is_house);
BEGIN
  -- Owners who appeared after 0074 (an owner listing a boat on the old code).
  CREATE TEMP TABLE late_owner_map ON COMMIT DROP AS
  SELECT u.id AS user_id,
         gen_random_uuid() AS account_id,
         coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email) AS name,
         u.email,
         u.phone_number
  FROM "user" u
  WHERE NOT (string_to_array(coalesce(u.role, ''), ',') && ARRAY['admin', 'broker'])
    AND EXISTS (SELECT 1 FROM "boat" b WHERE b.owner_id = u.id AND b.owner_account_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM "owner_account_member" m WHERE m.user_id = u.id AND m.role = 'OWNER');
  INSERT INTO "owner_account" ("id", "name", "contact_email", "contact_phone")
  SELECT account_id, name, email, phone_number FROM late_owner_map;
  INSERT INTO "owner_account_member" ("owner_account_id", "user_id", "role")
  SELECT account_id, user_id, 'OWNER' FROM late_owner_map;

  UPDATE "boat" b
  SET owner_account_id = coalesce(
    (SELECT m.owner_account_id FROM "owner_account_member" m
     WHERE m.user_id = b.owner_id AND m.role = 'OWNER' ORDER BY m.created_at LIMIT 1),
    house)
  WHERE b.owner_account_id IS NULL;
  UPDATE "booking" bk SET owner_account_id = b.owner_account_id
  FROM "boat" b WHERE b.id = bk.boat_id AND bk.owner_account_id IS NULL;

  IF EXISTS (SELECT 1 FROM "boat" WHERE owner_account_id IS NULL) THEN
    RAISE EXCEPTION 'owner accounts: some boats still have no owner_account_id; nothing was dropped';
  END IF;

  -- Being an owner is membership now, not a role.
  UPDATE "user"
  SET role = coalesce(nullif(array_to_string(array_remove(string_to_array(role, ','), 'owner'), ','), ''), 'customer')
  WHERE 'owner' = ANY(string_to_array(role, ','));

  -- The rest as drizzle-kit generated it.
  DROP TABLE "owner_profile" CASCADE;
  ALTER TABLE "boat" DROP CONSTRAINT "boat_owner_id_user_id_fk";
  ALTER TABLE "booking" DROP CONSTRAINT "booking_boat_owner_id_user_id_fk";
  DROP INDEX "boat_owner_idx";
  ALTER TABLE "boat" ALTER COLUMN "owner_account_id" SET NOT NULL;
  ALTER TABLE "boat" DROP COLUMN "owner_id";
  ALTER TABLE "booking" DROP COLUMN "boat_owner_id";
  DROP TYPE "public"."OwnerBusinessType";
END
$migration$;
