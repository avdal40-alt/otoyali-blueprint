const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013133000_jlc0915_dealer_live_history.sql"), "utf8");
const dealerPage = fs.readFileSync(path.join(__dirname, "..", "src", "app", "dealer", "[id]", "page.tsx"), "utf8");
const viewerPage = fs.readFileSync(path.join(__dirname, "..", "src", "app", "live", "[id]", "page.tsx"), "utf8");
const transport = fs.readFileSync(path.join(__dirname, "..", "src", "features", "dealer-live", "transport.ts"), "utf8");

for (const expected of ["CREATE OR REPLACE FUNCTION public.get_public_dealer_live_stream", "stream.status IN ('live', 'ended')", "CREATE OR REPLACE FUNCTION public.list_public_dealer_live_history", "stream.status = 'ended'", "public.is_verified_dealer(stream.dealer_id)", "COALESCE(media.card_url, media.large_url, media.url)", "TO anon, authenticated"]) assert.ok(migration.includes(expected), `missing ${expected}`);
assert.doesNotMatch(migration, /provider_stream_ref|recording_url|playback_url|phone|contact|auth\.users/i);
for (const expected of ["list_public_dealer_live_history", "Live now", "Past lives", "Recording unavailable.", "localizePath(`/live/${stream.stream_id}`, locale)"]) assert.ok(dealerPage.includes(expected), `dealer page missing ${expected}`);
for (const expected of ["status: \"live\" | \"ended\"", "stream.status === \"live\" ? \"LIVE\" : \"ENDED\"", "This live has ended."]) assert.ok(viewerPage.includes(expected), `viewer missing ${expected}`);
assert.match(transport, /supportsRecordings: boolean/);
assert.match(transport, /supportsRecordings: false/);

const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "outsider", "phone", "live", "ended"].map((key) => [key, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const runtime = `BEGIN;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone) VALUES ('${ids.phone}','${ids.dealer}','+7700${String(Date.now()).slice(-7)}',now(),'seller_otp',true);
INSERT INTO marketplace.dealer_verification_profiles(dealer_id,status,legal_entity_kind,business_registration_identifier,verified_phone_contact_id,dealer_trade_name,city,authorized_representative_name,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified','legal_entity','123456789012','${ids.phone}','JLC history dealer','Almaty','JLC representative',now(),'${ids.dealer}');
INSERT INTO marketplace.dealer_live_streams(id,dealer_id,title,status,started_at) VALUES ('${ids.live}','${ids.dealer}','JLC current live','live',now());
INSERT INTO marketplace.dealer_live_streams(id,dealer_id,title,status,started_at,ended_at) VALUES ('${ids.ended}','${ids.dealer}','JLC ended live','ended',now() - interval '1 hour',now());
SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.dealer)}';
SELECT (SELECT count(*) = 1 FROM public.list_public_dealer_live_streams('${ids.dealer}'::uuid, 12) WHERE stream_id='${ids.live}'::uuid)
  AND (SELECT count(*) = 1 FROM public.list_public_dealer_live_history('${ids.dealer}'::uuid, 12) WHERE stream_id='${ids.ended}'::uuid)
  AND (SELECT status = 'ended' FROM public.get_public_dealer_live_stream('${ids.ended}'::uuid));
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.outsider)}';
SELECT (SELECT count(*) = 1 FROM public.list_public_dealer_live_history('${ids.dealer}'::uuid, 12))
  AND (SELECT count(*) = 1 FROM public.get_public_dealer_live_stream('${ids.ended}'::uuid));
ROLLBACK;`;
assert.match(query(runtime), /t\s+t$/);
assert.throws(() => query(`BEGIN; SET LOCAL ROLE anon; SELECT * FROM marketplace.dealer_live_streams; ROLLBACK;`), /permission denied/i);
console.log("PASS JLC-0915 dealer live ended-state and public history matrix");
