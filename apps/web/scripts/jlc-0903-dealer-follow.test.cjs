const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261010193000_functional_09_dealer_follow.sql"), "utf8");
for (const expected of [
  "CREATE TABLE marketplace.dealer_follows",
  "PRIMARY KEY (dealer_id, follower_id)",
  "ENABLE ROW LEVEL SECURITY",
  "dealer_follows_select_own",
  "REVOKE ALL ON marketplace.dealer_follows FROM PUBLIC, anon, authenticated",
  "CREATE OR REPLACE FUNCTION public.toggle_dealer_follow",
  "IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required'",
  "seller_type = 'dealer'",
  "GRANT EXECUTE ON FUNCTION public.toggle_dealer_follow(UUID) TO authenticated"
]) assert.ok(migration.includes(expected), `missing ${expected}`);
assert.doesNotMatch(migration, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.toggle_dealer_follow\([^)]*\)\s+TO\s+(?:PUBLIC|anon)/i);

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "firstFollower", "secondFollower", "nonDealer"].map((name) => [name, randomUUID()]));
const userRows = Object.values(ids).map((id) => `('${id}','authenticated','authenticated','jlc0903-${id}@test.invalid','{}','{}',now(),now())`).join(",\n    ");
const asAuthenticated = (id) => `RESET ROLE; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',true);`;

const sql = `BEGIN;
  CREATE TEMP TABLE results (name text PRIMARY KEY, ok boolean NOT NULL) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO anon, authenticated;
  INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ${userRows};
  SET LOCAL ROLE service_role;
  UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${ids.dealer}';

  RESET ROLE; SET LOCAL ROLE anon;
  DO $$ BEGIN
    BEGIN PERFORM * FROM marketplace.dealer_follows; INSERT INTO results VALUES ('anonymous direct read denied', false);
    EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anonymous direct read denied', true); END;
    BEGIN PERFORM * FROM public.toggle_dealer_follow('${ids.dealer}'); INSERT INTO results VALUES ('anonymous RPC denied', false);
    EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anonymous RPC denied', true); END;
  END $$;

  ${asAuthenticated(ids.firstFollower)}
  INSERT INTO results SELECT 'first follower can follow', is_following AND follower_count = 1 FROM public.toggle_dealer_follow('${ids.dealer}');
  INSERT INTO results VALUES ('first follower sees only own row', (SELECT count(*) = 1 FROM marketplace.dealer_follows));
  DO $$ BEGIN
    BEGIN INSERT INTO marketplace.dealer_follows (dealer_id, follower_id) VALUES ('${ids.dealer}', '${ids.firstFollower}'); INSERT INTO results VALUES ('authenticated direct write denied', false);
    EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('authenticated direct write denied', true); END;
  END $$;

  ${asAuthenticated(ids.secondFollower)}
  INSERT INTO results SELECT 'second follower count consistent', is_following AND follower_count = 2 FROM public.toggle_dealer_follow('${ids.dealer}');
  INSERT INTO results VALUES ('second follower cannot read first follower row', (SELECT count(*) = 1 FROM marketplace.dealer_follows));

  ${asAuthenticated(ids.firstFollower)}
  INSERT INTO results SELECT 'first follower can unfollow', NOT is_following AND follower_count = 1 FROM public.toggle_dealer_follow('${ids.dealer}');
  DO $$ BEGIN
    BEGIN PERFORM * FROM public.toggle_dealer_follow('${ids.firstFollower}'); INSERT INTO results VALUES ('self follow denied', false);
    EXCEPTION WHEN SQLSTATE 'P0002' THEN INSERT INTO results VALUES ('self follow denied', true); END;
    BEGIN PERFORM * FROM public.toggle_dealer_follow('${ids.nonDealer}'); INSERT INTO results VALUES ('non-dealer follow denied', false);
    EXCEPTION WHEN SQLSTATE 'P0002' THEN INSERT INTO results VALUES ('non-dealer follow denied', true); END;
  END $$;

  RESET ROLE; SET LOCAL ROLE anon;
  INSERT INTO results VALUES ('public count is aggregate only', (SELECT follower_count = 1 AND NOT is_following FROM public.get_public_dealer_profile('${ids.dealer}')));
  RESET ROLE;
  SELECT name, ok FROM results ORDER BY name;
  ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.includes("|")).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
assert.equal(rows.length, 11, JSON.stringify(rows));
console.log(`PASS JLC-0903 dealer follow role/privacy matrix (${rows.length} checks)`);
