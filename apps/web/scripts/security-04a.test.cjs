const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationsRoot = path.join(repoRoot, "supabase", "migrations");
const version = "20260826120000";
const migrationName = `${version}_security04a_profile_phone_identity_hardening.sql`;
const migrationPath = path.join(migrationsRoot, migrationName);

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

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function localAuthenticatedJwt(secret, userId) {
  const header = base64Url({ alg: "HS256", typ: "JWT" });
  const payload = base64Url({
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: "authenticated",
    sub: userId
  });
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function restPatch({ status, token, userId, body }) {
  const result = spawnSync(process.platform === "win32" ? "curl.exe" : "curl", [
    "--silent", "--show-error",
    "--request", "PATCH",
    `${status.REST_URL}/profiles?id=eq.${userId}`,
    "--header", `apikey: ${status.ANON_KEY}`,
    "--header", `Authorization: Bearer ${token}`,
    "--header", "Content-Type: application/json",
    "--header", "Prefer: return=representation",
    "--data", JSON.stringify(body),
    "--write-out", "\n%{http_code}"
  ], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(["Local PostgREST PATCH failed", result.error?.message, result.stderr].filter(Boolean).join("\n"));
  }
  const lines = result.stdout.trimEnd().split(/\r?\n/);
  return { httpStatus: Number(lines.pop()), body: lines.join("\n") };
}

const migration = fs.readFileSync(migrationPath, "utf8");
for (const expected of [
  "DROP POLICY IF EXISTS profiles_insert_own",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER",
  "REVOKE UPDATE (",
  "phone,",
  "GRANT UPDATE (",
  "onboarding_completed_at",
  "ON public.profiles TO authenticated"
]) {
  assert.ok(migration.includes(expected), `Migration must include: ${expected}`);
}

const laterMigrations = fs.readdirSync(migrationsRoot)
  .filter((name) => name.endsWith(".sql") && name > "20260825120000_security02f_vehicle_ownership_contract.sql");
assert.deepEqual(laterMigrations, [migrationName], "SECURITY-04A must be the only additive migration after SECURITY-02F");

for (const relativePath of [
  ["src", "app", "otp", "_components", "OtpClient.tsx"],
  ["src", "app", "profile", "_components", "ProfileClient.tsx"],
  ["src", "app", "sell", "_components", "SellWizard.tsx"]
]) {
  const source = fs.readFileSync(path.join(projectRoot, ...relativePath), "utf8");
  assert.doesNotMatch(source, /from\("profiles"\)\.upsert/, `${relativePath.join("/")} must not use profile upsert`);
}

const profileSource = fs.readFileSync(path.join(projectRoot, "src", "app", "profile", "_components", "ProfileClient.tsx"), "utf8");
const sellSource = fs.readFileSync(path.join(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
assert.match(profileSource, /value=\{profile\?\.phone \?\? ""\}[\s\S]*?readOnly/);
assert.match(sellSource, /value=\{profile\.phone\}[\s\S]*?readOnly/);
assert.match(sellSource, /authPhone\.trim\(\) \|\| profile\?\.phone/);

const status = JSON.parse(supabase("status"));
assert.equal(status.linked_project, null, "Supabase must be unlinked");
for (const key of ["DB_URL", "API_URL", "REST_URL", "GRAPHQL_URL"]) {
  assert.match(status[key], /(?:127\.0\.0\.1|localhost)/, `${key} must be local-only`);
}

supabase("db", "reset", "--local");

const validationSql = String.raw`
\set QUIET 1
INSERT INTO auth.users (
  instance_id, id, aud, role, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '040a0000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', '+905551110001', pg_catalog.now(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"language":"tr","country":"TR","timezone":"Europe/Istanbul"}'::jsonb,
    pg_catalog.now(), pg_catalog.now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '040a0000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', '+905551110002', pg_catalog.now(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{}'::jsonb, pg_catalog.now(), pg_catalog.now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '040a0000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', '77011234567', pg_catalog.now(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"language":"en","country":"KZ","timezone":"Asia/Almaty"}'::jsonb,
    pg_catalog.now(), pg_catalog.now()
  );

DO $security04a$
DECLARE
  v_count bigint;
  v_role record;
  v_allowed constant text[] := ARRAY[
    'first_name', 'last_name', 'full_name', 'display_name', 'seller_type',
    'language', 'country', 'city', 'timezone', 'onboarding_completed_at'
  ];
BEGIN
  IF has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     OR has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     OR has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
     OR has_table_privilege('authenticated', 'public.profiles', 'REFERENCES')
     OR has_table_privilege('authenticated', 'public.profiles', 'TRIGGER') THEN
    RAISE EXCEPTION 'authenticated retains a table-level profile mutation privilege';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated profile SELECT was removed';
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND has_column_privilege('authenticated', 'public.profiles', column_name, 'INSERT');
  IF v_count <> 0 THEN RAISE EXCEPTION 'authenticated column INSERT remains'; END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE')
    AND NOT (column_name = ANY(v_allowed));
  IF v_count <> 0 THEN RAISE EXCEPTION 'protected profile column UPDATE remains'; END IF;

  SELECT count(*) INTO v_count
  FROM unnest(v_allowed) AS allowed(column_name)
  WHERE NOT has_column_privilege('authenticated', 'public.profiles', allowed.column_name, 'UPDATE');
  IF v_count <> 0 THEN RAISE EXCEPTION 'intended editable profile column lacks UPDATE'; END IF;

  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND cmd IN ('ALL', 'INSERT', 'DELETE')
    AND ('authenticated' = ANY(roles) OR 'public' = ANY(roles));
  IF v_count <> 0 THEN RAISE EXCEPTION 'authenticated alternate mutation policy remains'; END IF;

  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'profiles_update_own' AND cmd = 'UPDATE'
    AND qual = '(id = auth.uid())' AND with_check = '(id = auth.uid())';
  IF v_count <> 1 THEN RAISE EXCEPTION 'own-row UPDATE policy contract changed'; END IF;

  SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
  INTO v_role
  FROM pg_catalog.pg_roles WHERE rolname = 'authenticated';
  IF v_role.rolsuper OR v_role.rolcreaterole OR v_role.rolcreatedb OR v_role.rolcanlogin THEN
    RAISE EXCEPTION 'authenticated role has an unexpected elevated attribute';
  END IF;
END
$security04a$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '040a0000-0000-0000-0000-000000000001', false);

DO $security04a$
BEGIN
  BEGIN
    UPDATE public.profiles SET phone = '+905559990001'
    WHERE id = '040a0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'direct own phone UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.profiles SET city = 'Istanbul', phone = '+905559990001'
    WHERE id = '040a0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'mixed city and phone UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.profiles SET phone = NULL
    WHERE id = '040a0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'NULL phone UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.profiles SET phone = ''
    WHERE id = '040a0000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'empty phone UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.profiles (id, phone, city)
    VALUES ('040a0000-0000-0000-0000-000000000001', '+905559990001', 'Istanbul')
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, city = EXCLUDED.city;
    RAISE EXCEPTION 'phone upsert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$security04a$;

DO $security04a$
DECLARE v_rows bigint;
BEGIN
  UPDATE public.profiles
  SET first_name = 'Ada', last_name = 'Yilmaz', full_name = 'Ada Yilmaz',
      display_name = 'Ada Seller', seller_type = 'private', language = 'en',
      country = 'KZ', city = 'Almaty', timezone = 'Asia/Almaty',
      onboarding_completed_at = pg_catalog.now()
  WHERE id = '040a0000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'legitimate own profile UPDATE failed'; END IF;

  UPDATE public.profiles SET city = 'Istanbul'
  WHERE id = '040a0000-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'foreign profile UPDATE succeeded'; END IF;
END
$security04a$;
RESET ROLE;

DO $security04a$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count
  FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE u.id = '040a0000-0000-0000-0000-000000000001'
    AND u.phone = '+905551110001' AND p.phone = '+905551110001'
    AND p.city = 'Almaty' AND p.full_name = 'Ada Yilmaz';
  IF v_count <> 1 THEN RAISE EXCEPTION 'phone consistency or legitimate edit result failed'; END IF;

  SELECT count(*) INTO v_count
  FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE u.id = '040a0000-0000-0000-0000-000000000002'
    AND u.phone = '+905551110002' AND p.phone = '+905551110002' AND p.city IS NULL;
  IF v_count <> 1 THEN RAISE EXCEPTION 'foreign profile or bootstrap result failed'; END IF;

  SELECT count(*) INTO v_count
  FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE u.id = '040a0000-0000-0000-0000-000000000003'
    AND u.phone = '77011234567' AND p.phone = '+77011234567'
    AND p.language = 'en' AND p.country = 'KZ' AND p.timezone = 'Asia/Almaty';
  IF v_count <> 1 THEN RAISE EXCEPTION 'digits-only Auth phone bootstrap normalization failed'; END IF;
END
$security04a$;

SET ROLE service_role;
UPDATE public.profiles SET phone = '+905559990001'
WHERE id = '040a0000-0000-0000-0000-000000000001';
UPDATE public.profiles SET phone = '+905551110001'
WHERE id = '040a0000-0000-0000-0000-000000000001';
RESET ROLE;

DO $security04a$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count
  FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE u.id = '040a0000-0000-0000-0000-000000000001' AND u.phone = p.phone;
  IF v_count <> 1 THEN RAISE EXCEPTION 'trusted service path did not restore consistency'; END IF;
END
$security04a$;

\set QUIET 0
SELECT jsonb_build_object(
  'migration', '${version}',
  'authenticated_table', jsonb_build_object(
    'select', has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
    'insert', has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
    'update', has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
    'delete', has_table_privilege('authenticated', 'public.profiles', 'DELETE')
  ),
  'phone_update', has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE'),
  'city_update', has_column_privilege('authenticated', 'public.profiles', 'city', 'UPDATE'),
  'bootstrap_e164', (SELECT phone FROM public.profiles WHERE id = '040a0000-0000-0000-0000-000000000003'),
  'auth_profile_consistent', (SELECT u.phone = p.phone FROM auth.users u JOIN public.profiles p ON p.id = u.id WHERE u.id = '040a0000-0000-0000-0000-000000000001')
) AS security04a_runtime_matrix;
`;

const output = psql(validationSql);

const userA = "040a0000-0000-0000-0000-000000000001";
const userB = "040a0000-0000-0000-0000-000000000002";
const token = localAuthenticatedJwt(status.JWT_SECRET, userA);

const directRestAttack = restPatch({ status, token, userId: userA, body: { phone: "+905559990001" } });
assert.equal(directRestAttack.httpStatus, 403, "Direct PostgREST phone PATCH must be denied");

const mixedRestAttack = restPatch({
  status,
  token,
  userId: userA,
  body: { city: "Istanbul", phone: "+905559990001" }
});
assert.equal(mixedRestAttack.httpStatus, 403, "Mixed PostgREST city and phone PATCH must be denied atomically");

const legitimateRestEdit = restPatch({ status, token, userId: userA, body: { city: "Almaty" } });
assert.equal(legitimateRestEdit.httpStatus, 200, "Legitimate own PostgREST profile PATCH must succeed");

const foreignRestEdit = restPatch({ status, token, userId: userB, body: { city: "Istanbul" } });
assert.equal(foreignRestEdit.httpStatus, 200, "RLS-hidden foreign PostgREST PATCH should complete with zero rows");
assert.deepEqual(JSON.parse(foreignRestEdit.body), [], "Foreign PostgREST PATCH must return no rows");

const restState = psql(String.raw`
SELECT jsonb_build_object(
  'own_auth_phone', u.phone,
  'own_profile_phone', p.phone,
  'own_city', p.city,
  'foreign_city', (SELECT city FROM public.profiles WHERE id = '040a0000-0000-0000-0000-000000000002')
)
FROM auth.users u JOIN public.profiles p ON p.id = u.id
WHERE u.id = '040a0000-0000-0000-0000-000000000001';
`);
assert.match(restState, /"own_auth_phone": "\+905551110001"/);
assert.match(restState, /"own_profile_phone": "\+905551110001"/);
assert.match(restState, /"own_city": "Almaty"/);
assert.match(restState, /"foreign_city": null/);

const history = psql(String.raw`
SELECT string_agg(version, ',' ORDER BY version)
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260822120000', '20260825120000', '20260826120000');
`);
assert.match(history, /20260822120000,20260825120000,20260826120000/,
  "Clean reset must apply SECURITY-02A, SECURITY-02F, and SECURITY-04A in order");

console.log(output.trim());
console.log("SECURITY-04A PostgREST passed: direct and mixed phone PATCH denied; own edit allowed; foreign edit isolated");
console.log("SECURITY-04A runtime passed: own phone, mixed payload, NULL/empty, and upsert attacks denied");
console.log("SECURITY-04A profile behavior passed: intended own fields editable; foreign row isolated");
console.log("SECURITY-04A identity passed: bootstrap E.164 mirror and service path preserved");
console.log("SECURITY-04A local isolation passed: unlinked localhost Supabase; clean full migration chain applied");
