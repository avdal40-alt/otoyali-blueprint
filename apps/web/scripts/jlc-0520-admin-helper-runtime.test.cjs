const assert = require("node:assert/strict");

const studioUrl = process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323";
const parsedStudioUrl = new URL(studioUrl);
assert.ok(["127.0.0.1", "localhost"].includes(parsedStudioUrl.hostname), "JLC-0520 runtime test is local-only");
const queryUrl = new URL("/api/platform/pg-meta/default/query", parsedStudioUrl);

const sql = `
DO $test$
DECLARE
  admin_id UUID := 'f0520000-0000-4000-8000-000000000001';
  ordinary_id UUID := 'f0520000-0000-4000-8000-000000000002';
BEGIN
  IF has_function_privilege('anon', 'public.is_admin(uuid)', 'EXECUTE') IS NOT TRUE
     OR has_function_privilege('anon', 'public.admin_role(uuid)', 'EXECUTE') IS NOT TRUE THEN
    RAISE EXCEPTION 'anonymous EXECUTE must remain for RLS policy calls';
  END IF;

  INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (admin_id, 'authenticated', 'authenticated', 'jlc0520-admin@example.test', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (ordinary_id, 'authenticated', 'authenticated', 'jlc0520-user@example.test', '{}'::jsonb, '{}'::jsonb, now(), now());
  INSERT INTO public.admin_users (user_id, role, is_active) VALUES (admin_id, 'admin', TRUE);

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  IF public.is_admin(admin_id) IS DISTINCT FROM FALSE OR public.admin_role(admin_id) IS NOT NULL THEN
    RAISE EXCEPTION 'anonymous caller observed another user admin status';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'sub', ordinary_id)::text, TRUE);
  IF public.is_admin(admin_id) IS DISTINCT FROM FALSE OR public.admin_role(admin_id) IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated caller observed another user admin status';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'sub', admin_id)::text, TRUE);
  IF public.is_admin(admin_id) IS DISTINCT FROM TRUE OR public.admin_role(admin_id) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin self-check must remain available';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  IF public.is_admin(admin_id) IS DISTINCT FROM TRUE OR public.admin_role(admin_id) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'trusted service-role checks must remain available';
  END IF;

  DELETE FROM public.admin_users WHERE user_id IN (admin_id, ordinary_id);
  DELETE FROM auth.users WHERE id IN (admin_id, ordinary_id);
END;
$test$;
`;

(async () => {
  const response = await fetch(queryUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const body = await response.text();
  assert.equal(response.ok, true, `local JLC-0520 runtime matrix failed: ${body.slice(0, 1000)}`);
  console.log("JLC-0520 local anonymous/authenticated/service-role self-scope matrix passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
