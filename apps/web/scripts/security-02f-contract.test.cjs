const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationsRoot = path.join(repoRoot, "supabase", "migrations");
const expandVersion = "20260822120000";
const expandName = `${expandVersion}_security02a_vehicle_ownership_hardening.sql`;
const contractVersion = "20260825120000";
const contractName = `${contractVersion}_security02f_vehicle_ownership_contract.sql`;
const expandPath = path.join(migrationsRoot, expandName);
const contractPath = path.join(migrationsRoot, contractName);
const expectedExpandSha256 = "00b54f1f0f068a4ac6e07f99de5cbc2b7281ec6a4af0fba8d8b8a84f3e5307d9";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with status ${result.status}`,
      result.error?.message,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return result.stdout;
}

function supabase(...args) {
  if (process.platform === "win32") {
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", ["npx.cmd", "supabase", ...args].join(" ")]);
  }
  return run("npx", ["supabase", ...args]);
}

function psql(sql) {
  return run(
    "docker",
    ["exec", "-i", "supabase_db_Otoyali-blueprint", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    { input: sql }
  );
}

function includesAll(source, values) {
  for (const value of values) assert.ok(source.includes(value), `Expected source to include: ${value}`);
}

assert.equal(
  crypto.createHash("sha256").update(fs.readFileSync(expandPath)).digest("hex"),
  expectedExpandSha256,
  "Applied SECURITY-02A must remain byte-for-byte unchanged"
);

const contract = fs.readFileSync(contractPath, "utf8");
includesAll(contract, [
  "DROP POLICY IF EXISTS profile_ownership_insert_own_created_profile",
  "REVOKE INSERT (vehicle_profile_id, owner_id, ownership_type, is_current)",
  "REVOKE INSERT ON TABLE vehicle.profile_ownership FROM authenticated"
]);
assert.equal(/\b(?:DELETE\s+FROM|UPDATE|INSERT\s+INTO)\s+vehicle\.profile_ownership\b/i.test(contract), false,
  "CONTRACT must not mutate ownership data");
assert.equal(/\b(?:CREATE|ALTER|DROP)\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i.test(contract), false,
  "CONTRACT must not recreate or alter the initializer");
assert.equal(/\bREVOKE\s+SELECT\b/i.test(contract), false, "CONTRACT must preserve authenticated SELECT");

const laterMigrations = fs.readdirSync(migrationsRoot)
  .filter((name) => name.endsWith(".sql") && name > expandName);
assert.deepEqual(laterMigrations, [contractName], "Exactly one additive migration must follow SECURITY-02A");

const status = JSON.parse(supabase("status"));
assert.equal(status.linked_project, null, "Supabase must be unlinked");
for (const key of ["DB_URL", "API_URL", "REST_URL", "GRAPHQL_URL"]) {
  assert.match(status[key], /(?:127\.0\.0\.1|localhost)/, `${key} must be local-only`);
}

const fixtureSql = String.raw`
\set QUIET 1
INSERT INTO auth.users (
  instance_id, id, aud, role, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000102',
  'authenticated', 'authenticated', '+905559876543', pg_catalog.now(),
  '{"provider":"phone","providers":["phone"]}'::jsonb, '{}'::jsonb,
  pg_catalog.now(), pg_catalog.now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, phone, first_name, last_name, language, country, city, timezone)
VALUES (
  '00000000-0000-0000-0000-000000000102', '+905559876543', 'Other', 'Seller',
  'tr', 'TR', 'Ankara', 'Europe/Istanbul'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle.vehicle_profiles (
  id, make_id, model_id, year, mileage_km, fuel_type, transmission,
  body_type, created_source, profile_status, created_by
)
SELECT fixture.id, catalog.make_id, catalog.model_id, 2024, fixture.mileage_km,
  'gasoline', 'automatic', 'Sedan', 'manual', fixture.profile_status, fixture.created_by
FROM (VALUES
  ('21000000-0000-0000-0000-000000000001'::uuid, 100, 'active'::vehicle.profile_status, '00000000-0000-0000-0000-000000000101'::uuid),
  ('21000000-0000-0000-0000-000000000002'::uuid, 200, 'active'::vehicle.profile_status, '00000000-0000-0000-0000-000000000101'::uuid),
  ('21000000-0000-0000-0000-000000000003'::uuid, 300, 'active'::vehicle.profile_status, '00000000-0000-0000-0000-000000000101'::uuid),
  ('21000000-0000-0000-0000-000000000004'::uuid, 400, 'archived'::vehicle.profile_status, '00000000-0000-0000-0000-000000000101'::uuid),
  ('21000000-0000-0000-0000-000000000005'::uuid, 500, 'active'::vehicle.profile_status, '00000000-0000-0000-0000-000000000102'::uuid),
  ('21000000-0000-0000-0000-000000000006'::uuid, 600, 'active'::vehicle.profile_status, '00000000-0000-0000-0000-000000000101'::uuid)
) AS fixture(id, mileage_km, profile_status, created_by)
CROSS JOIN LATERAL (
  SELECT m.id AS make_id, mo.id AS model_id
  FROM vehicle.makes m
  JOIN vehicle.models mo ON mo.make_id = m.id
  WHERE m.is_active AND mo.is_active
  ORDER BY m.slug, mo.slug
  LIMIT 1
) catalog;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', false);

-- SECURITY-02A EXPAND: the old four-column payload and the new RPC both work.
INSERT INTO vehicle.profile_ownership (vehicle_profile_id, owner_id, ownership_type, is_current)
VALUES ('21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'owner', true);
SELECT * FROM public.initialize_own_vehicle_profile_ownership('21000000-0000-0000-0000-000000000002');
RESET ROLE;

CREATE TEMP TABLE security02f_snapshot AS
SELECT id, vehicle_profile_id, owner_id, ownership_type, is_current, started_at, ended_at, created_at
FROM vehicle.profile_ownership
WHERE vehicle_profile_id IN (
  '21000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000002'
);
`;

const validationSql = String.raw`
DO $security02f$
DECLARE
  v_count bigint;
  v_value boolean;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'vehicle'
    AND tablename = 'profile_ownership'
    AND policyname = 'profile_ownership_insert_own_created_profile';
  IF v_count <> 0 THEN RAISE EXCEPTION 'temporary INSERT policy remains'; END IF;

  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'vehicle' AND tablename = 'profile_ownership'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    AND ('authenticated' = ANY(roles) OR 'public' = ANY(roles));
  IF v_count <> 0 THEN RAISE EXCEPTION 'authenticated mutation policy remains under another name'; END IF;

  FOREACH v_value IN ARRAY ARRAY[
    has_table_privilege('authenticated', 'vehicle.profile_ownership', 'INSERT'),
    has_table_privilege('authenticated', 'vehicle.profile_ownership', 'UPDATE'),
    has_table_privilege('authenticated', 'vehicle.profile_ownership', 'DELETE'),
    has_table_privilege('authenticated', 'vehicle.profile_ownership', 'TRUNCATE'),
    has_table_privilege('authenticated', 'vehicle.profile_ownership', 'REFERENCES'),
    has_table_privilege('authenticated', 'vehicle.profile_ownership', 'TRIGGER')
  ] LOOP
    IF v_value THEN RAISE EXCEPTION 'authenticated table mutation privilege remains'; END IF;
  END LOOP;
  IF NOT has_table_privilege('authenticated', 'vehicle.profile_ownership', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated SELECT was removed';
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'vehicle' AND table_name = 'profile_ownership'
    AND (
      has_column_privilege('authenticated', format('%I.%I', table_schema, table_name), column_name, 'INSERT')
      OR has_column_privilege('authenticated', format('%I.%I', table_schema, table_name), column_name, 'UPDATE')
      OR has_column_privilege('authenticated', format('%I.%I', table_schema, table_name), column_name, 'REFERENCES')
    );
  IF v_count <> 0 THEN RAISE EXCEPTION 'authenticated column mutation privilege remains'; END IF;

  SELECT prosecdef AND proconfig = ARRAY['search_path=pg_catalog']
    AND pg_get_userbyid(proowner) = 'postgres'
  INTO v_value
  FROM pg_catalog.pg_proc
  WHERE oid = 'public.initialize_own_vehicle_profile_ownership(uuid)'::regprocedure;
  IF v_value IS DISTINCT FROM true THEN RAISE EXCEPTION 'initializer security metadata changed'; END IF;
  IF NOT has_function_privilege('authenticated', 'public.initialize_own_vehicle_profile_ownership(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.initialize_own_vehicle_profile_ownership(uuid)', 'EXECUTE')
    OR has_function_privilege('service_role', 'public.initialize_own_vehicle_profile_ownership(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'initializer role ACL changed';
  END IF;
  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  WHERE p.oid = 'public.initialize_own_vehicle_profile_ownership(uuid)'::regprocedure
    AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE';
  IF v_count <> 0 THEN RAISE EXCEPTION 'PUBLIC initializer EXECUTE restored'; END IF;

  IF NOT has_table_privilege('service_role', 'vehicle.profile_ownership', 'INSERT,UPDATE,DELETE,SELECT') THEN
    RAISE EXCEPTION 'service_role table maintenance capability changed';
  END IF;

  SELECT count(*) INTO v_count
  FROM security02f_snapshot before_row
  FULL JOIN (
    SELECT po.*
    FROM vehicle.profile_ownership po
    JOIN security02f_snapshot snapshot_ids USING (id)
  ) after_row USING (id)
  WHERE after_row.vehicle_profile_id IS DISTINCT FROM before_row.vehicle_profile_id
     OR after_row.owner_id IS DISTINCT FROM before_row.owner_id
     OR after_row.ownership_type IS DISTINCT FROM before_row.ownership_type
     OR after_row.is_current IS DISTINCT FROM before_row.is_current
     OR after_row.started_at IS DISTINCT FROM before_row.started_at
     OR after_row.ended_at IS DISTINCT FROM before_row.ended_at
     OR after_row.created_at IS DISTINCT FROM before_row.created_at;
  IF v_count <> 0 THEN RAISE EXCEPTION 'existing ownership data changed during CONTRACT'; END IF;
END
$security02f$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', false);

DO $security02f$
BEGIN
  BEGIN
    INSERT INTO vehicle.profile_ownership (vehicle_profile_id, owner_id, ownership_type, is_current)
    VALUES ('21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101', 'owner', true);
    RAISE EXCEPTION 'direct INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE vehicle.profile_ownership
    SET vehicle_profile_id = '21000000-0000-0000-0000-000000000005'
    WHERE vehicle_profile_id = '21000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'historical reassignment UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM vehicle.profile_ownership
    WHERE vehicle_profile_id = '21000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'direct DELETE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$security02f$;

SELECT * FROM public.initialize_own_vehicle_profile_ownership('21000000-0000-0000-0000-000000000003');

DO $security02f$
DECLARE v_before bigint; v_after bigint;
BEGIN
  SELECT count(*) INTO v_before FROM vehicle.profile_ownership;
  BEGIN PERFORM public.initialize_own_vehicle_profile_ownership('21000000-0000-0000-0000-000000000005');
    RAISE EXCEPTION 'foreign profile unexpectedly initialized'; EXCEPTION WHEN SQLSTATE 'OT404' THEN NULL; END;
  BEGIN PERFORM public.initialize_own_vehicle_profile_ownership('ffffffff-ffff-ffff-ffff-ffffffffffff');
    RAISE EXCEPTION 'missing profile unexpectedly initialized'; EXCEPTION WHEN SQLSTATE 'OT404' THEN NULL; END;
  BEGIN PERFORM public.initialize_own_vehicle_profile_ownership('21000000-0000-0000-0000-000000000004');
    RAISE EXCEPTION 'archived profile unexpectedly initialized'; EXCEPTION WHEN SQLSTATE 'OT404' THEN NULL; END;
  BEGIN PERFORM public.initialize_own_vehicle_profile_ownership('21000000-0000-0000-0000-000000000003');
    RAISE EXCEPTION 'duplicate initialization unexpectedly succeeded'; EXCEPTION WHEN SQLSTATE 'OT404' THEN NULL; END;
  SELECT count(*) INTO v_after FROM vehicle.profile_ownership;
  IF v_after <> v_before THEN RAISE EXCEPTION 'denied RPC left ownership residue'; END IF;
END
$security02f$;

DO $security02f$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM vehicle.profile_ownership
  WHERE vehicle_profile_id IN ('21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000003');
  IF v_count <> 3 THEN RAISE EXCEPTION 'own SELECT or initializer result failed'; END IF;
END
$security02f$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', false);
DO $security02f$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM vehicle.profile_ownership
  WHERE owner_id = '00000000-0000-0000-0000-000000000101';
  IF v_count <> 0 THEN RAISE EXCEPTION 'cross-user SELECT leaked ownership'; END IF;
END
$security02f$;
RESET ROLE;

SET ROLE anon;
DO $security02f$
BEGIN
  BEGIN
    PERFORM 1 FROM vehicle.profile_ownership LIMIT 1;
    RAISE EXCEPTION 'anon ownership SELECT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$security02f$;
RESET ROLE;

DO $security02f$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM (
    SELECT vehicle_profile_id FROM vehicle.profile_ownership WHERE is_current GROUP BY vehicle_profile_id HAVING count(*) > 1
  ) duplicate_current;
  IF v_count <> 0 THEN RAISE EXCEPTION 'duplicate current owners found'; END IF;
  SELECT count(*) INTO v_count FROM vehicle.profile_ownership WHERE is_current AND ended_at IS NOT NULL;
  IF v_count <> 0 THEN RAISE EXCEPTION 'current/ended contradiction found'; END IF;
  SELECT count(*) INTO v_count FROM vehicle.profile_ownership po
  JOIN vehicle.vehicle_profiles vp ON vp.id = po.vehicle_profile_id
  WHERE po.is_current AND po.owner_id <> vp.created_by;
  IF v_count <> 0 THEN RAISE EXCEPTION 'owner/creator mismatch found'; END IF;
  SELECT count(*) INTO v_count FROM pg_catalog.pg_indexes
  WHERE schemaname = 'vehicle' AND tablename = 'profile_ownership'
    AND indexname = 'profile_ownership_one_current_owner_idx'
    AND indexdef ~* 'UNIQUE' AND indexdef ~* 'WHERE \(is_current = true\)';
  IF v_count <> 1 THEN RAISE EXCEPTION 'partial current-owner unique index missing'; END IF;
END
$security02f$;

\set QUIET 0
SELECT jsonb_build_object(
  'authenticated_table', jsonb_build_object(
    'select', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'SELECT'),
    'insert', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'INSERT'),
    'update', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'UPDATE'),
    'delete', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'DELETE'),
    'truncate', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'TRUNCATE'),
    'references', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'REFERENCES'),
    'trigger', has_table_privilege('authenticated', 'vehicle.profile_ownership', 'TRIGGER')
  ),
  'policies', (SELECT jsonb_agg(jsonb_build_object('name', policyname, 'command', cmd, 'roles', roles) ORDER BY policyname)
    FROM pg_catalog.pg_policies WHERE schemaname = 'vehicle' AND tablename = 'profile_ownership'),
  'rpc', jsonb_build_object('authenticated_execute', has_function_privilege('authenticated', 'public.initialize_own_vehicle_profile_ownership(uuid)', 'EXECUTE')),
  'integrity', jsonb_build_object('duplicate_current', 0, 'current_ended', 0, 'owner_creator_mismatch', 0)
) AS security02f_runtime_matrix;
`;

let transitionOutput;
try {
  supabase("db", "reset", "--local", "--version", expandVersion);
  transitionOutput = psql(`${fixtureSql}\n${contract}\n${validationSql}`);
} finally {
  // Leave the disposable local database in the repository's full final-chain state.
  supabase("db", "reset", "--local");
}

const finalHistory = psql(String.raw`
SELECT string_agg(version, ',' ORDER BY version)
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260724120000', '20260822120000', '20260825120000');
`);
assert.match(finalHistory, /20260724120000,20260822120000,20260825120000/,
  "Clean final reset must apply SELL-03, SECURITY-02A, and SECURITY-02F in order");

console.log(transitionOutput.trim());
console.log("SECURITY-02F transition passed: EXPAND direct INSERT allowed, CONTRACT direct INSERT denied, RPC works before and after");
console.log("SECURITY-02F runtime passed: UPDATE/DELETE denied, negative RPC matrix safe, own SELECT isolated, data preserved, integrity clean");
console.log("SECURITY-02F local isolation passed: unlinked localhost Supabase; clean full migration chain applied");
