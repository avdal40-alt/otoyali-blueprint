const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013123000_jlc0912_dealer_live_domain.sql"), "utf8");
const transport = fs.readFileSync(path.join(root, "apps", "web", "src", "features", "dealer-live", "transport.ts"), "utf8");
for (const token of [
  "CREATE TABLE marketplace.dealer_live_streams", "CREATE TABLE marketplace.dealer_live_listing_attachments",
  "CREATE TABLE marketplace.dealer_live_state_transitions", "CREATE OR REPLACE FUNCTION marketplace.create_own_dealer_live_stream",
  "CREATE OR REPLACE FUNCTION marketplace.attach_own_dealer_live_listings", "CREATE OR REPLACE FUNCTION marketplace.start_own_dealer_live_stream", "CREATE OR REPLACE FUNCTION marketplace.end_own_dealer_live_stream",
  "CREATE OR REPLACE FUNCTION marketplace.stop_dealer_live_stream", "public.is_verified_dealer(v_actor)",
  "dealer-owned eligible listing required", "authorized live moderator required", "ENABLE ROW LEVEL SECURITY"
]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);
assert.match(transport, /interface DealerLiveTransportAdapter/);
assert.match(transport, /createLocalFakeDealerLiveTransport/);
assert.doesNotMatch(transport, /https?:\/\//i);

const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "outsider", "moderator", "phone", "make", "model", "vehicle", "listing"].map((key) => [key, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const runtime = `BEGIN;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.moderator}','authenticated','authenticated','moderator-${ids.moderator}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone) VALUES ('${ids.phone}','${ids.dealer}','+7700${String(Date.now()).slice(-7)}',now(),'seller_otp',true);
INSERT INTO marketplace.dealer_verification_profiles(dealer_id,status,legal_entity_kind,business_registration_identifier,verified_phone_contact_id,dealer_trade_name,city,authorized_representative_name,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified','legal_entity','123456789012','${ids.phone}','JLC live dealer','Almaty','JLC representative',now(),'${ids.dealer}');
INSERT INTO public.admin_users(user_id,role,is_active) VALUES ('${ids.moderator}','moderator',true);
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','JLC 0912 Make','jlc-0912-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','JLC 0912 Model','jlc-0912-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.dealer}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','JLC 0912 fixture',1,'KZT',false,'Almaty','dealer');
SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.dealer)}';
SELECT set_config('jlc0912.stream_id', marketplace.create_own_dealer_live_stream('JLC local live')::text, true);
SELECT marketplace.attach_own_dealer_live_listings(current_setting('jlc0912.stream_id')::uuid, ARRAY['${ids.listing}'::uuid]);
SELECT marketplace.start_own_dealer_live_stream(current_setting('jlc0912.stream_id')::uuid);
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.outsider)}';
DO $$ BEGIN
  BEGIN PERFORM marketplace.create_own_dealer_live_stream('unauthorized'); RAISE EXCEPTION 'unverified account unexpectedly created live'; EXCEPTION WHEN SQLSTATE 'OT403' THEN NULL; END;
  BEGIN PERFORM marketplace.end_own_dealer_live_stream(current_setting('jlc0912.stream_id')::uuid); RAISE EXCEPTION 'outsider unexpectedly ended live'; EXCEPTION WHEN SQLSTATE 'OT409' THEN NULL; END;
END $$;
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.moderator)}';
SELECT marketplace.stop_dealer_live_stream(current_setting('jlc0912.stream_id')::uuid, 'moderation stop');
RESET ROLE;
SELECT (SELECT status = 'stopped' AND provider_key = 'local_fake' AND stopped_by = '${ids.moderator}'::uuid FROM marketplace.dealer_live_streams WHERE id = current_setting('jlc0912.stream_id')::uuid)
  AND (SELECT count(*) = 1 FROM marketplace.dealer_live_listing_attachments WHERE stream_id = current_setting('jlc0912.stream_id')::uuid)
  AND (SELECT count(*) = 3 FROM marketplace.dealer_live_state_transitions WHERE stream_id = current_setting('jlc0912.stream_id')::uuid);
ROLLBACK;`;
assert.match(query(runtime), /t$/);
assert.throws(() => query(`BEGIN; SET LOCAL ROLE anon; SELECT * FROM marketplace.dealer_live_streams; ROLLBACK;`), /permission denied/i);
assert.throws(() => query(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.dealer)}'; UPDATE marketplace.dealer_live_streams SET status='live'; ROLLBACK;`), /permission denied/i);
console.log("PASS JLC-0912 dealer live authorization and state-machine matrix");
