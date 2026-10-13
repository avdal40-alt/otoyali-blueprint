const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013130000_jlc0914_dealer_live_comments_moderation.sql"), "utf8");
for (const token of [
  "CREATE TABLE marketplace.dealer_live_comments", "CREATE TABLE marketplace.dealer_live_comment_reports",
  "CREATE OR REPLACE FUNCTION marketplace.post_dealer_live_comment", "CREATE OR REPLACE FUNCTION marketplace.report_dealer_live_comment",
  "CREATE OR REPLACE FUNCTION marketplace.block_dealer_live_comment", "CREATE OR REPLACE FUNCTION public.list_public_dealer_live_comments",
  "pg_advisory_xact_lock", "live comment rate limit exceeded", "public.admin_role(v_actor)", "ENABLE ROW LEVEL SECURITY"
]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);

const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "author", "reporter", "outsider", "moderator", "phone", "stream"].map((key) => [key, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const runtime = `BEGIN;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.author}','authenticated','authenticated','author-${ids.author}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.reporter}','authenticated','authenticated','reporter-${ids.reporter}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.moderator}','authenticated','authenticated','moderator-${ids.moderator}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone) VALUES ('${ids.phone}','${ids.dealer}','+7700${String(Date.now()).slice(-7)}',now(),'seller_otp',true);
INSERT INTO marketplace.dealer_verification_profiles(dealer_id,status,legal_entity_kind,business_registration_identifier,verified_phone_contact_id,dealer_trade_name,city,authorized_representative_name,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified','legal_entity','123456789012','${ids.phone}','JLC comments dealer','Almaty','JLC representative',now(),'${ids.dealer}');
INSERT INTO public.admin_users(user_id,role,is_active) VALUES ('${ids.moderator}','moderator',true);
INSERT INTO marketplace.dealer_live_streams(id,dealer_id,title,status,started_at) VALUES ('${ids.stream}','${ids.dealer}','JLC comments live','live',now());
SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.author)}';
SELECT set_config('jlc0914.comment_id', (SELECT comment_id::text FROM marketplace.post_dealer_live_comment('${ids.stream}'::uuid, 'first comment')), true);
DO $$ BEGIN FOR i IN 1..9 LOOP PERFORM marketplace.post_dealer_live_comment('${ids.stream}'::uuid, 'rate comment ' || i); END LOOP; BEGIN PERFORM marketplace.post_dealer_live_comment('${ids.stream}'::uuid, 'too many'); RAISE EXCEPTION 'rate limit bypassed'; EXCEPTION WHEN SQLSTATE 'OT429' THEN NULL; END; END $$;
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.reporter)}';
SELECT marketplace.report_dealer_live_comment(current_setting('jlc0914.comment_id')::uuid, 'spam');
SELECT marketplace.report_dealer_live_comment(current_setting('jlc0914.comment_id')::uuid, 'spam');
DO $$ BEGIN BEGIN PERFORM marketplace.report_dealer_live_comment(current_setting('jlc0914.comment_id')::uuid, 'invalid'); RAISE EXCEPTION 'invalid report reason accepted'; EXCEPTION WHEN SQLSTATE 'OT422' THEN NULL; END; END $$;
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.outsider)}';
DO $$ BEGIN BEGIN PERFORM marketplace.block_dealer_live_comment(current_setting('jlc0914.comment_id')::uuid, 'forged moderation'); RAISE EXCEPTION 'outsider blocked comment'; EXCEPTION WHEN SQLSTATE 'OT403' THEN NULL; END; END $$;
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.moderator)}';
SELECT marketplace.block_dealer_live_comment(current_setting('jlc0914.comment_id')::uuid, 'spam policy');
RESET ROLE;
SELECT (SELECT count(*) = 1 FROM marketplace.dealer_live_comment_reports WHERE comment_id=current_setting('jlc0914.comment_id')::uuid)
  AND (SELECT status='blocked' AND blocked_by='${ids.moderator}'::uuid FROM marketplace.dealer_live_comments WHERE id=current_setting('jlc0914.comment_id')::uuid)
  AND (SELECT count(*) = 0 FROM public.list_public_dealer_live_comments('${ids.stream}'::uuid, 100) WHERE comment_id=current_setting('jlc0914.comment_id')::uuid)
  AND (SELECT count(*) = 1 FROM public.admin_audit_logs WHERE action='dealer_live.comment_block' AND entity_id=current_setting('jlc0914.comment_id')::uuid);
ROLLBACK;`;
assert.match(query(runtime), /t$/);
assert.throws(() => query(`BEGIN; SET LOCAL ROLE anon; SELECT * FROM marketplace.dealer_live_comments; ROLLBACK;`), /permission denied/i);
assert.throws(() => query(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.author)}'; UPDATE marketplace.dealer_live_comments SET body='bypass'; ROLLBACK;`), /permission denied/i);
console.log("PASS JLC-0914 live comment, report, rate-limit, and moderator-block matrix");
