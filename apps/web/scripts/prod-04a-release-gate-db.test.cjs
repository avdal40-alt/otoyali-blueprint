const assert = require("node:assert/strict");

const studioUrl = process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323";
const parsedStudioUrl = new URL(studioUrl);
assert.ok(["127.0.0.1", "localhost"].includes(parsedStudioUrl.hostname), "PROD-04A DB test is local-only");
const queryUrl = new URL("/api/platform/pg-meta/default/query", parsedStudioUrl);

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

const runtimeSql = `
CREATE TEMP TABLE prod04a_results(test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT) ON COMMIT DROP;
GRANT INSERT, SELECT ON prod04a_results TO anon, authenticated, service_role;

UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.headers','{}',true);
INSERT INTO prod04a_results VALUES ('old public read normal', public.release_gate_allows_request(), 'normal permits compatibility');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT set_config('request.headers','{}',true);
INSERT INTO prod04a_results VALUES ('old authenticated read normal', public.release_gate_allows_request(), 'normal permits compatibility');
INSERT INTO prod04a_results VALUES ('old authenticated mutation normal', public.release_gate_allows_request(), 'same pre-request boundary covers writes');
INSERT INTO prod04a_results VALUES ('old storage write normal', public.release_gate_allows_storage_write('f4000000-0000-4000-8000-000000000001/listing/file.jpg'), 'normal accepts legacy path');
RESET ROLE;

UPDATE public.release_compatibility_state SET mode='maintenance', updated_at=now() WHERE singleton;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.headers','{}',true);
INSERT INTO prod04a_results VALUES ('anonymous maintenance blocked', NOT public.release_gate_allows_request(), 'public PostgREST denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT set_config('request.headers','{}',true);
INSERT INTO prod04a_results VALUES ('stale session maintenance blocked', NOT public.release_gate_allows_request(), 'existing JWT does not bypass gate');
INSERT INTO prod04a_results VALUES ('profile mutation maintenance blocked', NOT public.release_gate_allows_request(), 'profile uses PostgREST boundary');
INSERT INTO prod04a_results VALUES ('sell mutation maintenance blocked', NOT public.release_gate_allows_request(), 'sell table and RPC calls use PostgREST boundary');
INSERT INTO prod04a_results VALUES ('old storage maintenance blocked', NOT public.release_gate_allows_storage_write('f4000000-0000-4000-8000-000000000001/listing/file.jpg'), 'legacy path denied');
SELECT set_config('request.headers','{"x-yolmod-release":"2026082801"}',true);
INSERT INTO prod04a_results VALUES ('candidate maintenance blocked', NOT public.release_gate_allows_request(), 'maintenance is a full ordinary-role stop');
INSERT INTO prod04a_results VALUES ('browser admin maintenance blocked', NOT public.release_gate_allows_request(), 'admin JWT remains authenticated at the pre-request boundary');
INSERT INTO prod04a_results VALUES ('new storage maintenance blocked', NOT public.release_gate_allows_storage_write('f4000000-0000-4000-8000-000000000001/prod04a-2026082801/listing/file.jpg'), 'maintenance denies candidate writes');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT set_config('request.headers','{}',true);
INSERT INTO prod04a_results VALUES ('service role maintenance request', public.release_gate_allows_request(), 'trusted bypass');
INSERT INTO prod04a_results VALUES ('service role maintenance storage', public.release_gate_allows_storage_write('system/file.jpg'), 'trusted bypass');
RESET ROLE;

UPDATE public.release_compatibility_state SET mode='enforce_minimum', updated_at=now() WHERE singleton;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT set_config('request.headers','{}',true);
INSERT INTO prod04a_results VALUES ('missing marker blocked', NOT public.release_gate_allows_request(), 'missing');
SELECT set_config('request.headers','{"x-yolmod-release":"latest"}',true);
INSERT INTO prod04a_results VALUES ('malformed marker blocked', NOT public.release_gate_allows_request(), 'malformed');
SELECT set_config('request.headers','{"x-yolmod-release":"2026082800"}',true);
INSERT INTO prod04a_results VALUES ('old marker blocked', NOT public.release_gate_allows_request(), 'below minimum');
SELECT set_config('request.headers','{"x-yolmod-release":"2026082801"}',true);
INSERT INTO prod04a_results VALUES ('new marker accepted', public.release_gate_allows_request(), 'at minimum');
INSERT INTO prod04a_results VALUES ('old storage path post migration blocked', NOT public.release_gate_allows_storage_write('f4000000-0000-4000-8000-000000000001/listing/file.jpg'), 'release segment absent');
INSERT INTO prod04a_results VALUES ('new storage path post migration accepted', public.release_gate_allows_storage_write('f4000000-0000-4000-8000-000000000001/prod04a-2026082801/listing/file.jpg'), 'release segment present');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.headers','{"x-yolmod-release":"2026082801"}',true);
INSERT INTO prod04a_results VALUES ('new anonymous public read post migration', public.release_gate_allows_request(), 'new public client admitted');
RESET ROLE;

INSERT INTO prod04a_results
SELECT 'postgrest pre-request configured',
       EXISTS (
         SELECT 1
         FROM pg_db_role_setting setting
         JOIN pg_roles role ON role.oid = setting.setrole
         WHERE role.rolname = 'authenticator'
           AND setting.setconfig @> ARRAY['pgrst.db_pre_request=public.enforce_release_compatibility']
       ),
       COALESCE((
         SELECT array_to_string(setting.setconfig, ',')
         FROM pg_db_role_setting setting
         JOIN pg_roles role ON role.oid = setting.setrole
         WHERE role.rolname = 'authenticator'
       ), 'missing');
INSERT INTO prod04a_results
SELECT 'cutover buckets private', count(*) = 3, count(*)::TEXT
FROM storage.buckets
WHERE id IN ('vehicle-photos','listing-media','listing-videos') AND public = FALSE;

UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;
SELECT test,passed,detail FROM prod04a_results ORDER BY test;
`;

(async () => {
  try {
    const results = await query(runtimeSql);
    assert.ok(results.length >= 20, `expected PROD-04A runtime matrix, got ${results.length} rows`);
    const failures = results.filter((result) => !result.passed);
    assert.deepEqual(failures, [], `PROD-04A runtime failures: ${JSON.stringify(failures, null, 2)}`);
    console.log(`PROD-04A local DB release matrix passed (${results.length} checks).`);
    for (const result of results) console.log(`PASS ${result.test}: ${result.detail}`);
  } finally {
    await query("UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;").catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
