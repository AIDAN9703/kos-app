-- Boat makes and models as their own tables (2026-10-13).
--
-- ONE statement on purpose: the migration runner (neon-http) runs statements
-- one by one with no transaction, and a DO block is all-or-nothing. It
-- creates boat_make and boat_model, seeds the makes we know, then links every
-- boat to a make and model from its old free-text make/model columns:
--   * makes match ignoring case, spaces, punctuation and a trailing
--     "Yachts"/"Boats"/"Marine" ("Azimut Yachts" is Azimut), or by another
--     known spelling ("SeaRay", "Cantiere del Pardo");
--   * "Custom …" descriptions and tiki boats are the make "Custom build";
--   * a boat type in the make field ("Cruiser", "Sport Yacht") isn't a make;
--   * make and model typed the wrong way round ("Verve 42" / "Azimut") swap;
--   * any other make is added as written;
--   * a boat with no make gets one from the start of its model or a word in
--     its name ("Azimut Grande 100", "46ft Bertram");
--   * a model that repeats its make drops it ("Azimut 88" is "88").
-- What can't be linked (no make to file a model under, a pasted paragraph)
-- is cleared from the old columns, so 0073 can check every boat is linked
-- before it drops them.

DO $migration$
BEGIN
  -- Tables, columns and constraints (as drizzle-kit generated them).
  CREATE TABLE "boat_make" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "boat_make_slug_unique" UNIQUE("slug")
  );
  CREATE TABLE "boat_model" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "make_id" uuid NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "boat_model_make_slug_unique" UNIQUE("make_id","slug"),
    CONSTRAINT "boat_model_make_id_id_unique" UNIQUE("make_id","id")
  );
  ALTER TABLE "boat" ADD COLUMN "make_id" uuid;
  ALTER TABLE "boat" ADD COLUMN "model_id" uuid;
  ALTER TABLE "boat_model" ADD CONSTRAINT "boat_model_make_id_boat_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."boat_make"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "boat_model_make_idx" ON "boat_model" USING btree ("make_id");
  ALTER TABLE "boat" ADD CONSTRAINT "boat_make_id_boat_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."boat_make"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "boat" ADD CONSTRAINT "boat_make_model_fk" FOREIGN KEY ("make_id","model_id") REFERENCES "public"."boat_model"("make_id","id") ON DELETE restrict ON UPDATE no action;
  CREATE INDEX "boat_make_idx" ON "boat" USING btree ("make_id");
  CREATE INDEX "boat_model_idx" ON "boat" USING btree ("model_id");
  ALTER TABLE "boat" ADD CONSTRAINT "boat_model_needs_make" CHECK ("boat"."model_id" IS NULL OR "boat"."make_id" IS NOT NULL);

  -- Helpers for this run only (pg_temp). They mirror features/boat-catalog/boat-catalog.keys.ts.
  CREATE FUNCTION pg_temp.catalog_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT regexp_replace(lower(translate(coalesce(t, ''), 'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕØÚÙÛÜÑÇáàâäãåéèêëíìîïóòôöõøúùûüñç', 'AAAAAAEEEEIIIIOOOOOOUUUUNCaaaaaaeeeeiiiioooooouuuunc')), '[^a-z0-9]', '', 'g')
  $f$;
  -- A trailing "Yachts", "Boats", "Marine"… word doesn't count ("Azimut Yachts" is Azimut), but only
  -- as a separate word: "Numarine" keeps its "marine".
  CREATE FUNCTION pg_temp.make_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT pg_temp.catalog_key(regexp_replace(lower(trim(coalesce(t, ''))),
      '\s+(yachts?|boats?|marine|boatworks|shipyard|catamarans?|group|international|inc\.?|llc)$', ''))
  $f$;
  CREATE FUNCTION pg_temp.catalog_slug(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT trim(both '-' FROM regexp_replace(lower(translate(t, 'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕØÚÙÛÜÑÇáàâäãåéèêëíìîïóòôöõøúùûüñç', 'AAAAAAEEEEIIIIOOOOOOUUUUNCaaaaaaeeeeiiiioooooouuuunc')), '[^a-z0-9]+', '-', 'g'))
  $f$;
  CREATE FUNCTION pg_temp.re_escape(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT regexp_replace(t, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g')
  $f$;

  -- The makes we know.
  INSERT INTO "boat_make" ("name", "slug")
  SELECT v.name, pg_temp.catalog_slug(v.name)
  FROM (VALUES
    ('Absolute'),
    ('Admiral'),
    ('Aicon'),
    ('Amels'),
    ('Arcadia'),
    ('Astondoa'),
    ('Azimut'),
    ('Baglietto'),
    ('Benetti'),
    ('Bertram'),
    ('Broward'),
    ('Burger'),
    ('Cabo'),
    ('Cantiere delle Marche'),
    ('Carver'),
    ('Christensen'),
    ('Codecasa'),
    ('Cranchi'),
    ('CRN'),
    ('Cruisers Yachts'),
    ('Custom Line'),
    ('Delta Marine'),
    ('Dominator'),
    ('Fairline'),
    ('Feadship'),
    ('Ferretti'),
    ('Galeon'),
    ('Grand Banks'),
    ('Hanover'),
    ('Hargrave'),
    ('Hatteras'),
    ('Heesen'),
    ('Horizon'),
    ('ISA'),
    ('Johnson'),
    ('Lazzara'),
    ('Lürssen'),
    ('Maiora'),
    ('Mainship'),
    ('Majesty'),
    ('Mangusta'),
    ('Marquis'),
    ('Mochi Craft'),
    ('Monte Carlo Yachts'),
    ('Moonen'),
    ('Neptunus'),
    ('Numarine'),
    ('NX Boats'),
    ('Ocean Alexander'),
    ('Ocean Yachts'),
    ('Oceanco'),
    ('Palm Beach Motor Yachts'),
    ('Pardo'),
    ('Perini Navi'),
    ('Pershing'),
    ('Prestige'),
    ('Princess'),
    ('Riva'),
    ('Rodman'),
    ('Sabre'),
    ('Sanlorenzo'),
    ('Schaefer'),
    ('Sea Ray'),
    ('Sealine'),
    ('Silverton'),
    ('Sirena'),
    ('Sunseeker'),
    ('Technomar'),
    ('Tiara'),
    ('Trinity'),
    ('Uniesse'),
    ('VanDutch'),
    ('Vanquish'),
    ('Viking'),
    ('Wally'),
    ('Westport'),
    ('Wider'),
    ('Axopar'),
    ('Back Cove'),
    ('Baja'),
    ('Bayliner'),
    ('Brig'),
    ('Chaparral'),
    ('Chris-Craft'),
    ('Cigarette'),
    ('Cobalt'),
    ('Donzi'),
    ('Fjord'),
    ('Formula'),
    ('Fountain'),
    ('Four Winns'),
    ('Frauscher'),
    ('Hinckley'),
    ('Maxum'),
    ('Midnight Express'),
    ('Monterey'),
    ('MTI'),
    ('Mystic'),
    ('Nor-Tech'),
    ('Outerlimits'),
    ('Regal'),
    ('Rinker'),
    ('Sacs'),
    ('Scarab'),
    ('Statement'),
    ('Yamaha'),
    ('Albemarle'),
    ('Angler'),
    ('Boston Whaler'),
    ('Cobia'),
    ('Contender'),
    ('Everglades'),
    ('Freeman'),
    ('Grady-White'),
    ('HCB'),
    ('Hydra-Sports'),
    ('Intrepid'),
    ('Invincible'),
    ('Jupiter'),
    ('Key West'),
    ('Luhrs'),
    ('Mako'),
    ('Pursuit'),
    ('Regulator'),
    ('Robalo'),
    ('Scout'),
    ('Sea Fox'),
    ('Sea Hunt'),
    ('SeaVee'),
    ('Sportsman'),
    ('Tempest'),
    ('Twin Vee'),
    ('Valhalla'),
    ('Wellcraft'),
    ('World Cat'),
    ('Yellowfin'),
    ('Aquila'),
    ('Bali'),
    ('Bavaria'),
    ('Beneteau'),
    ('Catana'),
    ('Dufour'),
    ('Excess'),
    ('Fountaine Pajot'),
    ('Hanse'),
    ('Jeanneau'),
    ('Lagoon'),
    ('Leopard'),
    ('Nautitech'),
    ('Privilege'),
    ('Seawind'),
    ('Sunreef'),
    ('Avalon'),
    ('Barletta'),
    ('Bennington'),
    ('Crest'),
    ('Godfrey'),
    ('Harris'),
    ('Manitou'),
    ('Premier'),
    ('Sun Tracker'),
    ('Sylvan'),
    ('Tahoe'),
    ('Ventura'),
    ('Axis'),
    ('Centurion'),
    ('Heyday'),
    ('Malibu'),
    ('MasterCraft'),
    ('Moomba'),
    ('Nautique'),
    ('Supra'),
    ('Tigé'),
    ('Highfield'),
    ('Kawasaki'),
    ('Novurania'),
    ('Sea-Doo'),
    ('Williams'),
    ('Zodiac'),
    ('Custom build')
  ) AS v(name);

  -- Every spelling of a known make: its name and the other ways people write it.
  CREATE TEMP TABLE spelling ON COMMIT DROP AS
  SELECT m.id AS make_id, m.name AS spelling, pg_temp.make_key(m.name) AS key, 0 AS rank
  FROM "boat_make" m
  UNION ALL
  SELECT m.id, v.spelling, pg_temp.make_key(v.spelling), 1
  FROM (VALUES
    ('SeaRay', 'Sea Ray'),
    ('Sea Ray Boats', 'Sea Ray'),
    ('Cantiere del Pardo', 'Pardo'),
    ('Chris Craft', 'Chris-Craft'),
    ('Grady White', 'Grady-White'),
    ('Nortech', 'Nor-Tech'),
    ('Seadoo', 'Sea-Doo'),
    ('Sea Doo', 'Sea-Doo'),
    ('Custom Line (Ferretti Group)', 'Custom Line'),
    ('San Lorenzo', 'Sanlorenzo'),
    ('Princess Yachts International', 'Princess'),
    ('Leopard Catamarans', 'Leopard'),
    ('Lurssen', 'Lürssen'),
    ('Custom', 'Custom build'),
    ('One-off build', 'Custom build')
  ) AS v(spelling, make)
  JOIN "boat_make" m ON m.name = v.make;

  -- Each boat's old make and model, tidied (trimmed, single spaces).
  CREATE TEMP TABLE src ON COMMIT DROP AS
  SELECT id AS boat_id, name,
         NULLIF(regexp_replace(trim(coalesce(make, '')), '\s+', ' ', 'g'), '') AS make_text,
         NULLIF(regexp_replace(trim(coalesce(model, '')), '\s+', ' ', 'g'), '') AS model_text,
         NULL::uuid AS make_id
  FROM "boat";
  -- Paragraphs pasted into the make field are descriptions, not makes.
  UPDATE src SET make_text = NULL WHERE length(make_text) > 60;

  -- 1. "Custom Catamaran", "Custom Mega Yacht", tiki boats… are one-off builds (Custom Line is a real make).
  UPDATE src SET make_id = (SELECT id FROM "boat_make" WHERE slug = 'custom-build')
  WHERE make_text IS NOT NULL
    AND ((pg_temp.catalog_key(make_text) LIKE 'custom%' AND pg_temp.catalog_key(make_text) NOT LIKE 'customline%')
         OR pg_temp.make_key(make_text) = 'tiki');

  -- 2. Known makes.
  UPDATE src s SET make_id = (
    SELECT sp.make_id FROM spelling sp WHERE sp.key = pg_temp.make_key(s.make_text) ORDER BY sp.rank LIMIT 1)
  WHERE s.make_id IS NULL AND s.make_text IS NOT NULL;

  -- 3. A boat type isn't a make ("Cruiser", "Sport Yacht", "Explorer Yachts"); step 6 may still find one.
  UPDATE src SET make_text = NULL
  WHERE make_id IS NULL AND pg_temp.make_key(make_text) IN ('yacht', 'yachts', 'boat', 'boats', 'vessel', 'catamaran', 'catamarans', 'cat', 'pontoon', 'tritoon', 'cruiser', 'sport', 'sports', 'motor', 'mega', 'super', 'luxury', 'party', 'sailing', 'sail', 'speed', 'house', 'power', 'fishing', 'flybridge', 'sportfish', 'sportfisher', 'sportfishing', 'centerconsole', 'express', 'explorer', 'trawler', 'sailboat', 'speedboat', 'partyboat', 'houseboat', 'motoryacht', 'superyacht', 'megayacht', 'sportyacht', 'other', 'unknown', 'na', 'none', 'tbd', 'various', 'misc');

  -- 4. Make and model the wrong way round: the model is a known make ("Verve 42" / "Azimut").
  UPDATE src s SET make_id = sp.make_id, model_text = s.make_text
  FROM spelling sp
  WHERE s.make_id IS NULL AND s.make_text IS NOT NULL AND sp.key = pg_temp.make_key(s.model_text);

  -- 5. Any other make, as written: one per spelling family, the most common spelling as its name.
  INSERT INTO "boat_make" ("name", "slug")
  SELECT DISTINCT ON (key) make_text, pg_temp.catalog_slug(make_text)
  FROM (SELECT make_text, pg_temp.make_key(make_text) AS key, count(*) OVER (PARTITION BY make_text) AS uses
        FROM src WHERE make_id IS NULL AND make_text IS NOT NULL) x
  WHERE key <> ''
  ORDER BY key, uses DESC, make_text
  ON CONFLICT ("slug") DO NOTHING;
  UPDATE src s SET make_id = (
    SELECT m.id FROM "boat_make" m WHERE pg_temp.make_key(m.name) = pg_temp.make_key(s.make_text) LIMIT 1)
  WHERE s.make_id IS NULL AND s.make_text IS NOT NULL;

  -- 6. No make given: a known make at the start of the model, or as a word in the boat's name.
  UPDATE src s SET make_id = (
    SELECT sp.make_id
    FROM spelling sp JOIN "boat_make" m ON m.id = sp.make_id
    WHERE m.slug <> 'custom-build'
      AND (lower(coalesce(s.model_text, '')) ~ ('^' || pg_temp.re_escape(lower(sp.spelling)) || '\M')
           OR (length(sp.spelling) >= 4
               AND lower(coalesce(s.name, '')) ~ ('\m' || pg_temp.re_escape(lower(sp.spelling)) || '\M')))
    ORDER BY length(sp.spelling) DESC
    LIMIT 1)
  WHERE s.make_id IS NULL AND s.make_text IS NULL;

  -- 7. A model that repeats its make drops it ("Azimut 88 Flybridge" under Azimut is "88 Flybridge").
  UPDATE src s
  SET model_text = NULLIF(trim(regexp_replace(s.model_text, '^' || pg_temp.re_escape(x.spelling) || '([\s:/-]+|$)', '', 'i')), '')
  FROM (SELECT DISTINCT ON (s2.boat_id) s2.boat_id, w.spelling
        FROM src s2
        JOIN (SELECT make_id, spelling FROM spelling UNION SELECT id, name FROM "boat_make") w
          ON w.make_id = s2.make_id
        WHERE s2.model_text ~* ('^' || pg_temp.re_escape(w.spelling) || '([\s:/-]+|$)')
        ORDER BY s2.boat_id, length(w.spelling) DESC) x
  WHERE x.boat_id = s.boat_id;

  -- 8. One model per make and spelling family, the most common spelling as its name.
  INSERT INTO "boat_model" ("make_id", "name", "slug")
  SELECT DISTINCT ON (make_id, key) make_id, model_text, pg_temp.catalog_slug(model_text)
  FROM (SELECT make_id, model_text, pg_temp.catalog_key(model_text) AS key,
               count(*) OVER (PARTITION BY make_id, model_text) AS uses
        FROM src
        WHERE make_id IS NOT NULL AND model_text IS NOT NULL AND pg_temp.catalog_key(model_text) <> '') x
  ORDER BY make_id, key, uses DESC, model_text
  ON CONFLICT ("make_id", "slug") DO NOTHING;

  -- 9. Link the boats.
  UPDATE "boat" b SET make_id = s.make_id
  FROM src s WHERE s.boat_id = b.id AND s.make_id IS NOT NULL;
  UPDATE "boat" b SET model_id = bm.id
  FROM src s
  JOIN "boat_model" bm
    ON bm.make_id = s.make_id AND pg_temp.catalog_key(bm.name) = pg_temp.catalog_key(s.model_text)
  WHERE s.boat_id = b.id AND s.model_text IS NOT NULL;

  -- 10. Clear what couldn't be linked, so the old columns only hold what the new ones say.
  UPDATE "boat" SET make = NULL WHERE make_id IS NULL AND make IS NOT NULL;
  UPDATE "boat" SET model = NULL WHERE model_id IS NULL AND model IS NOT NULL;
END
$migration$;
