const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013120000_jlc0904_dealer_posts.sql"), "utf8");
for (const token of [
  "CREATE TABLE marketplace.dealer_posts", "CREATE TABLE marketplace.dealer_post_listing_attachments",
  "CREATE OR REPLACE FUNCTION public.create_own_dealer_post", "public.is_verified_dealer(v_actor)",
  "dealer-owned eligible listing required", "CREATE OR REPLACE FUNCTION public.get_public_dealer_posts",
  "COALESCE(media.card_url, media.large_url, media.url)", "marketplace.is_listing_video_publicly_eligible",
  "GRANT EXECUTE ON FUNCTION public.get_public_dealer_posts(UUID, INTEGER) TO anon, authenticated"
]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);

const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();
const rows = query("SELECT has_function_privilege('anon', 'public.get_public_dealer_posts(uuid,integer)', 'EXECUTE'), has_function_privilege('authenticated', 'public.create_own_dealer_post(text,uuid[])', 'EXECUTE'), NOT has_table_privilege('anon', 'marketplace.dealer_posts', 'SELECT'), NOT has_table_privilege('authenticated', 'marketplace.dealer_posts', 'INSERT');").split("|");
assert.deepEqual(rows, ["t", "t", "t", "t"]);
const ids = Object.fromEntries(["dealer", "outsider", "phone", "make", "model", "vehicle", "listing"].map((key) => [key, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const runtime = `BEGIN;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone) VALUES ('${ids.phone}','${ids.dealer}','+7700${String(Date.now()).slice(-7)}',now(),'seller_otp',true);
INSERT INTO marketplace.dealer_verification_profiles(dealer_id,status,legal_entity_kind,business_registration_identifier,verified_phone_contact_id,dealer_trade_name,city,authorized_representative_name,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified','legal_entity','123456789012','${ids.phone}','JLC dealer','Almaty','JLC representative',now(),'${ids.dealer}');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','JLC 0904 Make','jlc-0904-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','JLC 0904 Model','jlc-0904-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.dealer}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','JLC 0904 fixture',1,'KZT',false,'Almaty','dealer');
SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.dealer)}';
SELECT public.create_own_dealer_post('Public dealer post', ARRAY['${ids.listing}'::uuid]) AS post_id INTO TEMP TABLE post;
RESET ROLE; SET LOCAL ROLE anon;
CREATE TEMP TABLE visible AS SELECT body = 'Public dealer post' AND attachments @> jsonb_build_array(jsonb_build_object('listing_id','${ids.listing}'::uuid,'title','JLC 0904 fixture')) AND attachments::text NOT LIKE '%seller%' AS public_safe FROM public.get_public_dealer_posts('${ids.dealer}', 20);
RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(ids.outsider)}';
DO $$ BEGIN BEGIN PERFORM public.create_own_dealer_post('unauthorized', ARRAY['${ids.listing}'::uuid]); RAISE EXCEPTION 'outsider unexpectedly posted'; EXCEPTION WHEN SQLSTATE 'OT403' THEN NULL; END; END $$;
RESET ROLE; SELECT (SELECT count(*) FROM post) = 1 AND (SELECT public_safe FROM visible) AS ok;
ROLLBACK;`;
assert.equal(query(runtime), "t");
console.log("JLC-0904 dealer posts ownership/media/privacy contract passed");
