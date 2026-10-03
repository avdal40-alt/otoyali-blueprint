const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHmac, randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const rows = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const json = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwtSecret = () => execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", "supabase_auth_Otoyali-blueprint"], { encoding: "utf8" })
  .split(/\r?\n/)
  .find((value) => value.startsWith("GOTRUE_JWT_SECRET="))
  ?.slice("GOTRUE_JWT_SECRET=".length);

function token(secret, sub) {
  const header = json({ alg: "HS256", typ: "JWT" });
  const payload = json({ role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 300, sub });
  return `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
}

function cleanup(ids) {
  const all = Object.values(ids).map((id) => `'${id}'`).join(",");
  rows(`
    DELETE FROM public.admin_audit_logs
    WHERE entity_type = 'galeri_verification' AND entity_id = '${ids.dealer}'
       OR actor_user_id IN (${all});
    DELETE FROM marketplace.galeri_verification_transitions WHERE dealer_id = '${ids.dealer}';
    DELETE FROM marketplace.galeri_verifications WHERE dealer_id = '${ids.dealer}';
    DELETE FROM public.admin_users WHERE user_id = '${ids.reviewer}';
    DELETE FROM identity.audit_logs WHERE resource_id IN (${all}) OR user_id IN (${all});
    DELETE FROM auth.users WHERE id IN (${all});
  `);

  const residual = rows(`
    SELECT 'auth.users', count(*) FROM auth.users WHERE id IN (${all})
    UNION ALL SELECT 'public.profiles', count(*) FROM public.profiles WHERE id IN (${all})
    UNION ALL SELECT 'identity.user_settings', count(*) FROM identity.user_settings WHERE user_id IN (${all})
    UNION ALL SELECT 'identity.notification_preferences', count(*) FROM identity.notification_preferences WHERE user_id IN (${all})
    UNION ALL SELECT 'identity.user_roles', count(*) FROM identity.user_roles WHERE user_id IN (${all})
    UNION ALL SELECT 'identity.audit_logs', count(*) FROM identity.audit_logs WHERE resource_id IN (${all}) OR user_id IN (${all})
    UNION ALL SELECT 'public.admin_users', count(*) FROM public.admin_users WHERE user_id IN (${all})
    UNION ALL SELECT 'public.admin_audit_logs', count(*) FROM public.admin_audit_logs WHERE entity_id = '${ids.dealer}' OR actor_user_id IN (${all})
    UNION ALL SELECT 'marketplace.galeri_verifications', count(*) FROM marketplace.galeri_verifications WHERE dealer_id = '${ids.dealer}'
    UNION ALL SELECT 'marketplace.galeri_verification_transitions', count(*) FROM marketplace.galeri_verification_transitions WHERE dealer_id = '${ids.dealer}';
  `);
  assert.deepEqual(residual.sort(), residual.map((line) => line.replace(/\|\d+$/, "|0")).sort(), `fixture cleanup left rows: ${residual.join(", ")}`);
}

async function createVerifiedGaleriFixture() {
  const secret = jwtSecret();
  assert.ok(secret, "local GoTrue JWT secret is required");

  const ids = { dealer: randomUUID(), reviewer: randomUUID(), normal: randomUUID() };
  rows(`
    INSERT INTO auth.users (instance_id, id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000000', '${ids.dealer}', 'authenticated', 'authenticated', '{}', '{}', now(), now()),
      ('00000000-0000-0000-0000-000000000000', '${ids.reviewer}', 'authenticated', 'authenticated', '{}', '{}', now(), now()),
      ('00000000-0000-0000-0000-000000000000', '${ids.normal}', 'authenticated', 'authenticated', '{}', '{}', now(), now());
    UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${ids.dealer}';
    INSERT INTO public.admin_users (user_id, role, is_active) VALUES ('${ids.reviewer}', 'moderator', true);
  `);

  const url = "http://127.0.0.1:54321";
  const client = (id, schema = "public") => createClient(url, token(secret, id), { auth: { persistSession: false }, db: { schema } });
  const dealer = client(ids.dealer, "marketplace");
  const reviewer = client(ids.reviewer, "marketplace");
  const normal = client(ids.normal);

  try {
    const submitted = await dealer.rpc("submit_galeri_verification", { p_evidence_metadata: {} });
    assert.ifError(submitted.error);
    assert.equal(submitted.data, "pending");

    const reviewed = await reviewer.rpc("review_galeri_verification", {
      p_dealer_id: ids.dealer,
      p_next_status: "verified",
      p_review_note: "local test fixture",
    });
    assert.ifError(reviewed.error);
    assert.equal(reviewed.data, "verified");

    return { ids, normal, verified: client(ids.dealer), cleanup: () => cleanup(ids) };
  } catch (error) {
    cleanup(ids);
    throw error;
  }
}

module.exports = { createVerifiedGaleriFixture };
