const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260913130000_functional_02g_galeri_verification_foundation.sql"), "utf8");
const contract = fs.readFileSync(path.join(root, "apps/web/src/lib/marketplace/galeri-verification-contract.ts"), "utf8");

for (const expected of [
  "CREATE TYPE marketplace.galeri_verification_status AS ENUM ('pending', 'verified', 'rejected')",
  "CREATE TABLE marketplace.galeri_verifications", "CREATE TABLE marketplace.galeri_verification_transitions",
  "evidence_metadata JSONB NOT NULL", "galeri_verifications_evidence_size_chk", "reviewed_by UUID REFERENCES auth.users", "galeri_verification_transitions_changed_chk",
  "marketplace.submit_galeri_verification", "marketplace.review_galeri_verification", "public.is_verified_galeri",
  "COALESCE(public.admin_role(v_actor_id), '') NOT IN ('owner', 'admin', 'moderator')",
  "v_previous_status = 'pending'", "v_previous_status = 'verified'", "galeri_verification.transition",
  "ENABLE ROW LEVEL SECURITY", "galeri_verifications_select_own", "galeri_verification_transitions_select_reviewers",
  "REVOKE ALL ON FUNCTION", "REVOKE ALL ON TABLE", "GRANT SELECT ON TABLE"
]) assert.ok(migration.includes(expected), `missing ${expected}`);

assert.match(contract, /isVerifiedGaleri/);
assert.match(contract, /public\.is_verified_galeri/);
assert.doesNotMatch(contract, /export\s+(?:type|interface|const)[\s\S]*(?:evidenceMetadata|reviewNote|verificationStatus)/i, "public contract must not expose private verification data");
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);
assert.doesNotMatch(migration, /\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i);
assert.doesNotMatch(migration, /CREATE POLICY[^;]+FOR\s+(?:INSERT|UPDATE|DELETE)[^;]+TO\s+authenticated/i);

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim();
const dealerId = "00000000-0000-0000-0000-000000000g01".replace("g", "0");
const outsiderId = "00000000-0000-0000-0000-000000000002";
const moderatorId = "00000000-0000-0000-0000-000000000003";
const supportId = "00000000-0000-0000-0000-000000000004";

const setupUsers = `
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('${dealerId}', 'authenticated', 'authenticated', 'functional-02g-dealer@example.test', '{}', '{}', now(), now()),
  ('${outsiderId}', 'authenticated', 'authenticated', 'functional-02g-outsider@example.test', '{}', '{}', now(), now()),
  ('${moderatorId}', 'authenticated', 'authenticated', 'functional-02g-moderator@example.test', '{}', '{}', now(), now()),
  ('${supportId}', 'authenticated', 'authenticated', 'functional-02g-support@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${dealerId}';
INSERT INTO public.admin_users (user_id, role, is_active) VALUES
  ('${moderatorId}', 'moderator', TRUE), ('${supportId}', 'support', TRUE);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${dealerId}', true);
SELECT marketplace.submit_galeri_verification('{"tax_certificate_ref":"private-ref"}'::jsonb);
SELECT status || '|' || (evidence_metadata ->> 'tax_certificate_ref')
FROM marketplace.galeri_verifications WHERE dealer_id = '${dealerId}';
SET LOCAL ROLE service_role;
SELECT count(*) FROM marketplace.galeri_verification_transitions WHERE dealer_id = '${dealerId}';
ROLLBACK;`;
assert.equal(query(setupUsers).split("\n").slice(-2).join("\n"), "pending|private-ref\n1", "dealer sees only its private submission and the initial transition is auditable internally");

assert.throws(() => query(`
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('${dealerId}', 'authenticated', 'authenticated', 'functional-02g-dealer@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role; UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${dealerId}';
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${dealerId}', true);
SELECT marketplace.review_galeri_verification('${dealerId}', 'verified', 'self approval'); ROLLBACK;`), /authorized Galeri reviewer required/i, "dealer cannot self-verify");

assert.throws(() => query(`
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('${dealerId}', 'authenticated', 'authenticated', 'functional-02g-dealer@example.test', '{}', '{}', now(), now()),
  ('${supportId}', 'authenticated', 'authenticated', 'functional-02g-support@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role; UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${dealerId}';
INSERT INTO public.admin_users (user_id, role, is_active) VALUES ('${supportId}', 'support', TRUE);
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${dealerId}', true);
SELECT marketplace.submit_galeri_verification('{}'::jsonb);
SELECT set_config('request.jwt.claim.sub', '${supportId}', true);
SELECT marketplace.review_galeri_verification('${dealerId}', 'verified', 'support approval'); ROLLBACK;`), /authorized Galeri reviewer required/i, "support cannot verify a Galeri");

const reviewMatrix = `
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('${dealerId}', 'authenticated', 'authenticated', 'functional-02g-dealer@example.test', '{}', '{}', now(), now()),
  ('${outsiderId}', 'authenticated', 'authenticated', 'functional-02g-outsider@example.test', '{}', '{}', now(), now()),
  ('${moderatorId}', 'authenticated', 'authenticated', 'functional-02g-moderator@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role; UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${dealerId}';
INSERT INTO public.admin_users (user_id, role, is_active) VALUES ('${moderatorId}', 'moderator', TRUE);
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${dealerId}', true);
SELECT marketplace.submit_galeri_verification('{"authority_certificate_ref":"private-ref"}'::jsonb);
SELECT set_config('request.jwt.claim.sub', '${outsiderId}', true);
SELECT count(*) FROM marketplace.galeri_verifications;
SELECT set_config('request.jwt.claim.sub', '${moderatorId}', true);
SELECT marketplace.review_galeri_verification('${dealerId}', 'verified', 'approved');
SET LOCAL ROLE anon;
SELECT public.is_verified_galeri('${dealerId}');
SET LOCAL ROLE service_role;
SELECT (SELECT count(*) FROM marketplace.galeri_verification_transitions WHERE dealer_id = '${dealerId}') || '|' ||
       (SELECT count(*) FROM public.admin_audit_logs WHERE entity_type = 'galeri_verification' AND entity_id = '${dealerId}');
ROLLBACK;`;
const reviewOutput = query(reviewMatrix);
assert.match(reviewOutput, new RegExp(`\\n0\\n${moderatorId}\\n`), "unrelated authenticated users see no private verification data");
assert.equal(reviewOutput.split("\n").slice(-3).join("\n"), "verified\nt\n2|1", "moderator verification is audited and anon gets only the public-safe signal");

assert.throws(() => query("BEGIN; SET LOCAL ROLE anon; SELECT * FROM marketplace.galeri_verifications; ROLLBACK;"), /permission denied/i, "anon cannot read private verification data");
assert.throws(() => query(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${dealerId}', true); INSERT INTO marketplace.galeri_verifications (dealer_id) VALUES ('${dealerId}'); ROLLBACK;`), /permission denied/i, "authenticated clients cannot mutate verification state directly");
const functionPrivileges = query("SELECT has_function_privilege('anon', 'marketplace.submit_galeri_verification(jsonb)', 'EXECUTE'), has_function_privilege('authenticated', 'marketplace.review_galeri_verification(uuid, marketplace.galeri_verification_status, text)', 'EXECUTE'), has_function_privilege('anon', 'public.is_verified_galeri(uuid)', 'EXECUTE')");
assert.equal(functionPrivileges, "f|t|t", "only controlled functions are callable by their intended roles");

console.log("FUNCTIONAL-02G Galeri verification foundation static security contract passed");
