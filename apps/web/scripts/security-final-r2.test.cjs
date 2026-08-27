const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const studioUrl = process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323";
const parsedStudioUrl = new URL(studioUrl);
assert.ok(["127.0.0.1", "localhost"].includes(parsedStudioUrl.hostname), "SFI-002 runtime test is local-only");

const queryUrl = new URL("/api/platform/pg-meta/default/query", parsedStudioUrl);
const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationPath = path.join(
  repoRoot,
  "supabase",
  "migrations",
  "20260827125000_security_final_admin_acl_hardening.sql"
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");

for (const required of [
  "REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN",
  "ON ALL TABLES IN SCHEMA public, vehicle, marketplace, identity, booking, service_marketplace",
  "FROM anon, authenticated;",
  "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
  "GRANT ALL PRIVILEGES",
  "ON TABLE public.admin_users, public.admin_audit_logs",
  "TO service_role;"
]) {
  assert.ok(migrationSql.includes(required), `migration must include: ${required}`);
}

for (const forbidden of [
  "GRANT ALL PRIVILEGES TO anon",
  "GRANT ALL PRIVILEGES TO authenticated",
  "DISABLE ROW LEVEL SECURITY",
  "DROP TABLE public.admin_users",
  "DROP TABLE public.admin_audit_logs"
]) {
  assert.ok(!migrationSql.includes(forbidden), `migration must exclude: ${forbidden}`);
}

async function query(sql) {
  const response = await fetch(queryUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Local SQL failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : [];
}

const ids = {
  owner: "f2000000-0000-4000-8000-000000000001",
  ordinary: "f2000000-0000-4000-8000-000000000002",
  target: "f2000000-0000-4000-8000-000000000003",
  ownerAdmin: "f2100000-0000-4000-8000-000000000001",
  targetAdmin: "f2100000-0000-4000-8000-000000000003",
  audit: "f2200000-0000-4000-8000-000000000001",
  adminAudit: "f2200000-0000-4000-8000-000000000002",
  serviceAudit: "f2200000-0000-4000-8000-000000000003"
};

const cleanupSql = `
DELETE FROM public.admin_audit_logs
WHERE id IN ('${ids.audit}','${ids.adminAudit}','${ids.serviceAudit}');
DELETE FROM public.admin_users
WHERE id IN ('${ids.ownerAdmin}','${ids.targetAdmin}')
   OR user_id IN ('${ids.owner}','${ids.ordinary}','${ids.target}');
DELETE FROM public.profiles WHERE id IN ('${ids.owner}','${ids.ordinary}','${ids.target}');
DELETE FROM auth.users WHERE id IN ('${ids.owner}','${ids.ordinary}','${ids.target}');
`;

const runtimeSql = `
CREATE TEMP TABLE sfi002_results(test text PRIMARY KEY, passed boolean, detail text) ON COMMIT DROP;
GRANT INSERT, SELECT, UPDATE ON sfi002_results TO anon, authenticated, service_role;

CREATE TABLE public.sfi002_default_acl_probe (id bigint PRIMARY KEY);
INSERT INTO sfi002_results
SELECT 'default ACL owner context', pg_get_userbyid(c.relowner) = 'postgres', pg_get_userbyid(c.relowner)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'sfi002_default_acl_probe';

INSERT INTO sfi002_results
SELECT 'future public table dangerous privileges absent', count(*) = 0,
       coalesce(string_agg(role_name || ':' || privilege, ',' ORDER BY role_name, privilege), 'none')
FROM (VALUES ('anon'),('authenticated')) roles(role_name)
CROSS JOIN (VALUES ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) privileges(privilege)
WHERE has_table_privilege(role_name, 'public.sfi002_default_acl_probe', privilege);

INSERT INTO sfi002_results
SELECT 'global dangerous privilege guard', count(*) = 0,
       coalesce(string_agg(role_name || ':' || schema_name || '.' || table_name || ':' || privilege, ',' ORDER BY role_name, schema_name, table_name, privilege), 'none')
FROM (
  SELECT role_name, n.nspname schema_name, c.relname table_name, privilege
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('anon'),('authenticated')) roles(role_name)
  CROSS JOIN (VALUES ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) privileges(privilege)
  WHERE c.relkind IN ('r','p')
    AND n.nspname IN ('public','vehicle','marketplace','identity','booking','service','service_marketplace')
    AND has_table_privilege(role_name, format('%I.%I', n.nspname, c.relname), privilege)
) dangerous;

DO $do$
DECLARE role_name text; table_name text; privilege text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH table_name IN ARRAY ARRAY['admin_users','admin_audit_logs'] LOOP
      FOREACH privilege IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        INSERT INTO sfi002_results VALUES (
          role_name || ' ' || table_name || ' ' || lower(privilege) || ' absent',
          NOT has_table_privilege(role_name, format('public.%I', table_name), privilege),
          privilege
        );
      END LOOP;
    END LOOP;
  END LOOP;
END
$do$;

SET LOCAL ROLE anon;
DO $do$ BEGIN
  BEGIN
    TRUNCATE TABLE public.admin_users;
    INSERT INTO sfi002_results VALUES ('anon truncate admin_users denied', false, 'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('anon truncate admin_users denied', true, SQLERRM);
  END;
  BEGIN
    TRUNCATE TABLE public.admin_audit_logs;
    INSERT INTO sfi002_results VALUES ('anon truncate admin_audit_logs denied', false, 'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('anon truncate admin_audit_logs denied', true, SQLERRM);
  END;
END $do$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $do$ BEGIN
  BEGIN
    TRUNCATE TABLE public.admin_users;
    INSERT INTO sfi002_results VALUES ('authenticated truncate admin_users denied', false, 'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('authenticated truncate admin_users denied', true, SQLERRM);
  END;
  BEGIN
    TRUNCATE TABLE public.admin_audit_logs;
    INSERT INTO sfi002_results VALUES ('authenticated truncate admin_audit_logs denied', false, 'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('authenticated truncate admin_audit_logs denied', true, SQLERRM);
  END;
END $do$;
RESET ROLE;

INSERT INTO auth.users (id,phone,raw_app_meta_data,raw_user_meta_data,aud,role) VALUES
 ('${ids.owner}','+905550002001','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated'),
 ('${ids.ordinary}','+905550002002','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated'),
 ('${ids.target}','+905550002003','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated');
INSERT INTO public.admin_users (id,user_id,role,is_active)
VALUES ('${ids.ownerAdmin}','${ids.owner}','owner',true);
INSERT INTO public.admin_audit_logs (id,actor_user_id,action,entity_type,metadata)
VALUES ('${ids.audit}','${ids.owner}','sfi002.fixture','security_test','{}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.ordinary}","role":"authenticated"}',true);
DO $do$
DECLARE affected integer;
BEGIN
  BEGIN
    INSERT INTO public.admin_users (user_id,role,is_active) VALUES ('${ids.ordinary}','owner',true);
    INSERT INTO sfi002_results VALUES ('ordinary user self-assign denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('ordinary user self-assign denied',true,SQLERRM);
  END;

  UPDATE public.admin_users SET role='support' WHERE id='${ids.ownerAdmin}';
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO sfi002_results VALUES ('ordinary user admin update denied',affected=0,'affected=' || affected);

  DELETE FROM public.admin_users WHERE id='${ids.ownerAdmin}';
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO sfi002_results VALUES ('ordinary user admin delete denied',affected=0,'affected=' || affected);

  BEGIN
    UPDATE public.admin_audit_logs SET action='sfi002.rewrite' WHERE id='${ids.audit}';
    INSERT INTO sfi002_results VALUES ('ordinary user audit rewrite denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('ordinary user audit rewrite denied',true,SQLERRM);
  END;

  BEGIN
    DELETE FROM public.admin_audit_logs WHERE id='${ids.audit}';
    INSERT INTO sfi002_results VALUES ('ordinary user audit erase denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi002_results VALUES ('ordinary user audit erase denied',true,SQLERRM);
  END;
END $do$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.owner}","role":"authenticated"}',true);
INSERT INTO public.admin_users (id,user_id,role,is_active)
VALUES ('${ids.targetAdmin}','${ids.target}','moderator',true);
UPDATE public.admin_users SET role='support' WHERE id='${ids.targetAdmin}';
DELETE FROM public.admin_users WHERE id='${ids.targetAdmin}';
INSERT INTO public.admin_audit_logs (id,actor_user_id,action,entity_type,metadata)
VALUES ('${ids.adminAudit}','${ids.owner}','sfi002.admin','security_test','{}');
INSERT INTO sfi002_results VALUES ('authenticated admin workflow',true,'manage assignment and append audit allowed');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO public.admin_users (id,user_id,role,is_active)
VALUES ('${ids.targetAdmin}','${ids.target}','moderator',true);
UPDATE public.admin_users SET role='support' WHERE id='${ids.targetAdmin}';
DELETE FROM public.admin_users WHERE id='${ids.targetAdmin}';
INSERT INTO public.admin_audit_logs (id,actor_user_id,action,entity_type,metadata)
VALUES ('${ids.serviceAudit}','${ids.owner}','sfi002.service','security_test','{}');
DELETE FROM public.admin_audit_logs WHERE id='${ids.serviceAudit}';
INSERT INTO sfi002_results VALUES ('service_role trusted maintenance',true,'DML maintenance allowed intentionally');
RESET ROLE;

DROP TABLE public.sfi002_default_acl_probe;
SELECT test,passed,detail FROM sfi002_results ORDER BY test;
`;

(async () => {
  await query(cleanupSql);
  try {
    const results = await query(runtimeSql);
    assert.ok(results.length >= 29, `expected SFI-002 runtime matrix, got ${results.length} rows`);
    const failures = results.filter((result) => !result.passed);
    assert.deepEqual(failures, [], `SFI-002 runtime failures: ${JSON.stringify(failures, null, 2)}`);
    console.log(`SECURITY-FINAL-R2 runtime authorization matrix passed (${results.length} checks).`);
    for (const result of results) console.log(`PASS ${result.test}: ${result.detail}`);
  } finally {
    await query(cleanupSql);
    await query("DROP TABLE IF EXISTS public.sfi002_default_acl_probe;");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
