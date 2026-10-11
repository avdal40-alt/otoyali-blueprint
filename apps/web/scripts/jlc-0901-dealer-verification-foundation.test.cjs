const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261011160000_jlc0901_dealer_verification_foundation.sql"), "utf8");
for (const expected of ["dealer_verification_profiles", "pending', 'verified', 'rejected', 'suspended", "verified_phone_contact_id", "submit_own_dealer_verification", "review_dealer_verification", "public.is_verified_dealer", "authorized dealer reviewer required", "ENABLE ROW LEVEL SECURITY", "REVOKE ALL ON TABLE"]) assert.ok(migration.includes(expected), `missing ${expected}`);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim();
const dealer = "00000000-0000-0000-0000-000000009101";
const outsider = "00000000-0000-0000-0000-000000009102";
const moderator = "00000000-0000-0000-0000-000000009103";
const contact = "00000000-0000-0000-0000-000000009104";

const matrix = `
BEGIN;
INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('${dealer}','authenticated','authenticated','jlc0901-dealer@example.test','{}','{}',now(),now()),
 ('${outsider}','authenticated','authenticated','jlc0901-outsider@example.test','{}','{}',now(),now()),
 ('${moderator}','authenticated','authenticated','jlc0901-moderator@example.test','{}','{}',now(),now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type='dealer' WHERE id='${dealer}';
INSERT INTO identity.verified_seller_contact_phones (id,user_id,phone_e164,verification_source,is_active,verified_at) VALUES ('${contact}','${dealer}','+77010000001','seller_otp',TRUE,now());
INSERT INTO public.admin_users (user_id,role,is_active) VALUES ('${moderator}','moderator',TRUE);
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${dealer}',true);
SELECT marketplace.submit_own_dealer_verification('legal_entity','123456789012','${contact}','Jolcar Motors','Almaty','Aizada K.');
SELECT set_config('request.jwt.claim.sub','${outsider}',true); SELECT count(*) FROM marketplace.dealer_verification_profiles;
SELECT set_config('request.jwt.claim.sub','${moderator}',true); SELECT marketplace.review_dealer_verification('${dealer}','verified','approved');
SET LOCAL ROLE anon; SELECT public.is_verified_dealer('${dealer}');
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${moderator}',true); SELECT marketplace.review_dealer_verification('${dealer}','suspended','suspicious activity');
SET LOCAL ROLE anon; SELECT public.is_verified_dealer('${dealer}');
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${moderator}',true); SELECT marketplace.review_dealer_verification('${dealer}','verified','reinstated');
SET LOCAL ROLE service_role; SELECT status || '|' || (SELECT count(*) FROM marketplace.dealer_verification_transitions WHERE dealer_id='${dealer}') FROM marketplace.dealer_verification_profiles WHERE dealer_id='${dealer}';
ROLLBACK;`;
const matrixOutput = query(matrix);
assert.match(matrixOutput, /00000000-0000-0000-0000-000000009101\npending\n00000000-0000-0000-0000-000000009102\n0\n00000000-0000-0000-0000-000000009103\nverified\nt\n00000000-0000-0000-0000-000000009103\nsuspended\nf\n00000000-0000-0000-0000-000000009103\nverified\nverified\|4$/, "owner submission, reviewer transitions, public signal, and suspension matrix must hold");
assert.throws(() => query(`BEGIN; INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES ('${dealer}','authenticated','authenticated','jlc0901-dealer@example.test','{}','{}',now(),now()); SET LOCAL ROLE service_role; UPDATE public.profiles SET seller_type='dealer' WHERE id='${dealer}'; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${dealer}',true); SELECT marketplace.review_dealer_verification('${dealer}','verified'); ROLLBACK;`), /authorized dealer reviewer required/i);
assert.throws(() => query("BEGIN; SET LOCAL ROLE anon; SELECT * FROM marketplace.dealer_verification_profiles; ROLLBACK;"), /permission denied/i);
assert.throws(() => query(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${dealer}',true); UPDATE marketplace.dealer_verification_profiles SET status='verified' WHERE dealer_id='${dealer}'; ROLLBACK;`), /permission denied/i);
console.log("PASS JLC-0901 dealer verification role and admin security matrix");
