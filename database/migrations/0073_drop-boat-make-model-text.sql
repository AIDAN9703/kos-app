-- Drop the old free-text make/model columns, now that every boat points at
-- boat_make / boat_model (0072). One statement, so the check and the drop
-- happen together or not at all.
--
-- 0072 linked every boat and cleared what it couldn't link, so a make or
-- model left without its id was saved after 0072 ran (by code from before
-- the switch). Refuses to drop anything until those are linked.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "boat"
    WHERE (make_id IS NULL AND trim(coalesce(make, '')) <> '')
       OR (model_id IS NULL AND trim(coalesce(model, '')) <> '')
  ) THEN
    RAISE EXCEPTION 'boat make/model: some boats have a make or model with no make_id/model_id; link them before dropping the old columns';
  END IF;

  DROP INDEX "boat_search_make_model_idx";
  ALTER TABLE "boat" DROP COLUMN "make";
  ALTER TABLE "boat" DROP COLUMN "model";
END
$migration$;
