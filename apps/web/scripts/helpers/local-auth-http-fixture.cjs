const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHmac, randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const supabaseCli = "C:\\Users\\Work\\AppData\\Local\\npm-cache\\_npx\\66b4952730d9cac8\\node_modules\\@supabase\\cli-windows-x64\\bin\\supabase.exe";
const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const rows = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const json = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function localSupabaseEnvironment() {
  const output = execFileSync(supabaseCli, ["status", "-o", "env"], { encoding: "utf8" }).trim();
  const values = output.startsWith("{")
    ? JSON.parse(output)
    : Object.fromEntries(output.split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")]; }));
  const url = values.API_URL || "http://127.0.0.1:54321";
  const anonKey = values.ANON_KEY;
  assert.match(url, /^http:\/\/(?:127\.0\.0\.1|localhost):54321$/, "fixture must use local Supabase");
  assert.ok(anonKey, "local Supabase anon key is required");
  return { url, anonKey };
}

function localJwtConfiguration() {
  const values = Object.fromEntries(execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", "supabase_auth_Otoyali-blueprint"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
  return { secret: values.GOTRUE_JWT_SECRET, issuer: values.GOTRUE_JWT_ISSUER, audience: values.GOTRUE_JWT_AUD };
}

function token({ secret, issuer, audience }, role, userId) {
  const header = json({ alg: "HS256", typ: "JWT" });
  const payload = json({ iss: issuer, role, aud: audience, exp: Math.floor(Date.now() / 1000) + 300, ...(userId ? { sub: userId } : {}) });
  return `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
}

function createLocalClient(role, userId, schema = "public") {
  const { url, anonKey } = localSupabaseEnvironment();
  const jwt = localJwtConfiguration();
  assert.ok(jwt.secret && jwt.issuer && jwt.audience, "local GoTrue JWT configuration is required");
  const accessToken = token(jwt, role, userId);
  return { accessToken, client: createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } }, db: { schema } }), localSupabase: { url, anonKey } };
}

function cleanup(userId) {
  rows(`
    DELETE FROM identity.audit_logs WHERE resource_id = '${userId}' OR user_id = '${userId}';
    DELETE FROM auth.users WHERE id = '${userId}';
  `);
  const residual = rows(`
    SELECT 'auth.users', count(*) FROM auth.users WHERE id = '${userId}'
    UNION ALL SELECT 'public.profiles', count(*) FROM public.profiles WHERE id = '${userId}'
    UNION ALL SELECT 'identity.user_settings', count(*) FROM identity.user_settings WHERE user_id = '${userId}'
    UNION ALL SELECT 'identity.notification_preferences', count(*) FROM identity.notification_preferences WHERE user_id = '${userId}'
    UNION ALL SELECT 'identity.user_roles', count(*) FROM identity.user_roles WHERE user_id = '${userId}'
    UNION ALL SELECT 'identity.audit_logs', count(*) FROM identity.audit_logs WHERE resource_id = '${userId}' OR user_id = '${userId}'
    UNION ALL SELECT 'marketplace.listings', count(*) FROM marketplace.listings WHERE seller_id = '${userId}';
  `);
  assert.deepEqual(residual.sort(), residual.map((line) => line.replace(/\|\d+$/, "|0")).sort(), `auth fixture cleanup left rows: ${residual.join(", ")}`);
}

async function createLocalAuthenticatedHttpFixture({ phone = null, label = "http" } = {}) {
  const userId = randomUUID();
  rows(`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', '${userId}', 'authenticated', 'authenticated',
      'sell-sec-04c1-${label}-${userId}@example.test', now(), '', '', '', '', '{}', '{}', false, now(), now()
    );
    ${phone ? `UPDATE auth.users SET phone = '${phone}', phone_confirmed_at = now() WHERE id = '${userId}';` : ""}
  `);
  const { accessToken, client, localSupabase } = createLocalClient("authenticated", userId);
  try {
    const { data: user, error: userError } = await client.auth.getUser(accessToken);
    assert.ifError(userError);
    assert.equal(user.user?.id, userId, "local Auth session must resolve to its fixture user");
    const { data: profile, error: profileError } = await client.from("profiles").select("id").eq("id", userId);
    assert.ifError(profileError);
    assert.deepEqual(profile, [{ id: userId }], "authenticated Data API actor must read only its own fixture profile");
    return { accessToken, client, localSupabase, userId, cleanup: () => cleanup(userId) };
  } catch (error) {
    cleanup(userId);
    throw error;
  }
}

module.exports = { createLocalAuthenticatedHttpFixture, createLocalClient, localSupabaseEnvironment };
