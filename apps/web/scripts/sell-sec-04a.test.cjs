const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migrationPath = path.join(repoRoot, "supabase", "migrations", "20261001000000_sell_sec_04a_turkey_seller_phone_eligibility.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const repairMigration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20261001010000_sell_sec_04a_fix_turkey_seller_phone_e164_constraint.sql"), "utf8");
const aiSources = [
  path.join(repoRoot, "apps", "web", "src", "features", "ai", "sell", "sell-runtime.ts"),
  path.join(repoRoot, "apps", "web", "src", "features", "ai", "moderation", "deterministic-text-moderation.ts")
].map((file) => fs.readFileSync(file, "utf8")).join("\n");

for (const token of [
  "CREATE TABLE identity.seller_phone_verifications",
  "phone_e164 TEXT NOT NULL UNIQUE",
  "phone_e164 ~ '^\\\\+90[1-9][0-9]{9}$'",
  "CREATE FUNCTION identity.record_verified_turkey_seller_phone",
  "CREATE FUNCTION public.is_turkey_seller_phone_verified()",
  "auth.uid()",
  "ENABLE ROW LEVEL SECURITY",
  "REVOKE ALL ON TABLE identity.seller_phone_verifications FROM PUBLIC, anon, authenticated",
  "GRANT ALL ON TABLE identity.seller_phone_verifications TO service_role",
  "GRANT EXECUTE ON FUNCTION public.is_turkey_seller_phone_verified() TO authenticated"
]) assert.ok(migration.includes(token), `missing SELL-SEC-04A contract: ${token}`);
assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION identity\.record_verified_turkey_seller_phone\(UUID, TEXT\) TO authenticated/i);
assert.match(repairMigration, /DROP CONSTRAINT seller_phone_verifications_turkey_e164_chk/);
assert.match(repairMigration, /CHECK \(phone_e164 ~ '\^\[\+\]90\[1-9\]\[0-9\]\{9\}\$'\)/);
assert.doesNotMatch(repairMigration, /CREATE TABLE|CREATE FUNCTION|CREATE POLICY|GRANT|REVOKE/i);
assert.doesNotMatch(aiSources, /seller_phone_verifications|record_verified_turkey_seller_phone/i);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const seller = randomUUID();
const buyer = randomUUID();
const authTurkeyOnly = randomUUID();
const verifiedTurkey = "+905551234567";
const replacementTurkey = "+903121234567";

function query(sql) {
  return execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
}

const sql = `
BEGIN;
CREATE TEMP TABLE sell_sec_04a_results (name TEXT PRIMARY KEY, passed BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON sell_sec_04a_results TO anon, authenticated, service_role;

INSERT INTO auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '${seller}', 'authenticated', 'authenticated', '77001234567', NOW(), '{"provider":"phone","providers":["phone"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '${buyer}', 'authenticated', 'authenticated', NULL, NULL, '{}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '${authTurkeyOnly}', 'authenticated', 'authenticated', '905551111111', NOW(), '{"provider":"phone","providers":["phone"]}', '{}', NOW(), NOW());

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
DO $$ BEGIN
  BEGIN
    PERFORM public.is_turkey_seller_phone_verified();
    INSERT INTO sell_sec_04a_results VALUES ('anonymous eligibility execute denied', FALSE);
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sell_sec_04a_results VALUES ('anonymous eligibility execute denied', TRUE);
  END;
  BEGIN
    PERFORM * FROM identity.seller_phone_verifications;
    INSERT INTO sell_sec_04a_results VALUES ('anonymous verification-store read denied', FALSE);
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sell_sec_04a_results VALUES ('anonymous verification-store read denied', TRUE);
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${seller}"}', TRUE);
INSERT INTO sell_sec_04a_results VALUES ('foreign auth phone is not seller eligible', NOT public.is_turkey_seller_phone_verified());
DO $$ BEGIN
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${seller}', '${verifiedTurkey}');
    INSERT INTO sell_sec_04a_results VALUES ('authenticated direct verified-phone insert denied', FALSE);
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sell_sec_04a_results VALUES ('authenticated direct verified-phone insert denied', TRUE);
  END;
  BEGIN
    UPDATE identity.seller_phone_verifications SET verified_at = NOW() WHERE user_id = '${seller}';
    INSERT INTO sell_sec_04a_results VALUES ('authenticated direct verified timestamp update denied', FALSE);
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sell_sec_04a_results VALUES ('authenticated direct verified timestamp update denied', TRUE);
  END;
  BEGIN
    PERFORM * FROM identity.seller_phone_verifications WHERE user_id = '${authTurkeyOnly}';
    INSERT INTO sell_sec_04a_results VALUES ('authenticated cross-user verification-store read denied', FALSE);
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sell_sec_04a_results VALUES ('authenticated cross-user verification-store read denied', TRUE);
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${authTurkeyOnly}"}', TRUE);
INSERT INTO sell_sec_04a_results VALUES ('auth +90 alone is not seller eligible', NOT public.is_turkey_seller_phone_verified());

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
SELECT identity.record_verified_turkey_seller_phone('${seller}', '${verifiedTurkey}');
DO $$ BEGIN
  BEGIN
    PERFORM identity.record_verified_turkey_seller_phone('${buyer}', '+77001234567');
    INSERT INTO sell_sec_04a_results VALUES ('trusted writer rejects foreign phone', FALSE);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    INSERT INTO sell_sec_04a_results VALUES ('trusted writer rejects foreign phone', TRUE);
  END;
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${buyer}', '905551234567');
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects missing plus', FALSE);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects missing plus', TRUE);
  END;
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${buyer}', '+90555123456');
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects short number', FALSE);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects short number', TRUE);
  END;
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${buyer}', '+9055512345678');
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects long number', FALSE);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects long number', TRUE);
  END;
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${buyer}', '+445551234567');
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects foreign +44 number', FALSE);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects foreign +44 number', TRUE);
  END;
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${buyer}', '+90ABC1234567');
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects malformed number', FALSE);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects malformed number', TRUE);
  END;
  BEGIN
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${buyer}', NULL);
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects null number', FALSE);
  EXCEPTION WHEN not_null_violation THEN
    INSERT INTO sell_sec_04a_results VALUES ('constraint rejects null number', TRUE);
  END;
END $$;
SELECT identity.record_verified_turkey_seller_phone('${seller}', '${replacementTurkey}');
INSERT INTO sell_sec_04a_results
VALUES ('trusted replacement is atomic and current', EXISTS (
  SELECT 1 FROM identity.seller_phone_verifications
  WHERE user_id = '${seller}' AND phone_e164 = '${replacementTurkey}'
));

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${seller}"}', TRUE);
INSERT INTO sell_sec_04a_results VALUES ('verified +90 seller is eligible', public.is_turkey_seller_phone_verified());

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${buyer}"}', TRUE);
INSERT INTO sell_sec_04a_results VALUES ('other user cannot inherit seller eligibility', NOT public.is_turkey_seller_phone_verified());

RESET ROLE;
SELECT name || '|' || passed FROM sell_sec_04a_results ORDER BY name;
ROLLBACK;`;

const results = query(sql).filter((line) => /\|(true|false)$/.test(line));
assert.ok(results.length >= 10, "all SELL-SEC-04A role checks must run");
for (const line of results) assert.ok(line.endsWith("|true"), line);

const catalog = query(`SELECT has_table_privilege('anon', 'identity.seller_phone_verifications', 'SELECT,INSERT,UPDATE,DELETE') || '|' || has_table_privilege('authenticated', 'identity.seller_phone_verifications', 'SELECT,INSERT,UPDATE,DELETE') || '|' || has_function_privilege('anon', 'public.is_turkey_seller_phone_verified()', 'EXECUTE') || '|' || has_function_privilege('authenticated', 'public.is_turkey_seller_phone_verified()', 'EXECUTE') || '|' || has_function_privilege('authenticated', 'identity.record_verified_turkey_seller_phone(uuid,text)', 'EXECUTE') || '|' || (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'identity.seller_phone_verifications'::regclass);`)[0].split("|");
assert.deepEqual(catalog, ["false", "false", "false", "true", "false", "true"]);

console.log(`PASS SELL-SEC-04A seller eligibility matrix (${results.length} checks)`);
