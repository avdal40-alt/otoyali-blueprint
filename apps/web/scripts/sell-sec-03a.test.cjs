const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migrationPath = path.join(root, "supabase", "migrations", "20260923150000_sell_sec_03a_atomic_draft_media_contract.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
for (const fragment of ["CREATE FUNCTION public.create_own_listing_draft(", "CREATE FUNCTION public.attach_own_listing_media(", "SECURITY DEFINER", "SET search_path = public, pg_catalog", "auth.uid()", "REVOKE ALL ON FUNCTION", "GRANT EXECUTE", "vehicle.profile_media_path_matches", "FROM storage.objects AS object"]) assert.ok(migration.includes(fragment), fragment);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "other", "make", "model", "otherModel", "variant", "city", "otherCity", "district", "otherDistrict", "media", "foreignMedia", "atomicMarker"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const asRole = (role, sub) => `RESET ROLE; SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claims TO '${claims(role, sub)}';`;
const create = (overrides = "") => `SELECT * FROM public.create_own_listing_draft('${ids.make}'::uuid,'${ids.model}'::uuid,'${ids.variant}'::uuid,2024::smallint,100,'used','gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL,NULL,NULL,1.6,'unknown',NULL,'safe description','100000','TRY',false,'03A City','${ids.city}'::uuid,'${ids.district}'::uuid) ${overrides};`;

const sql = `BEGIN;
CREATE TEMP TABLE sell_sec_03a_results (name text primary key, ok boolean not null, detail text) ON COMMIT DROP;
GRANT SELECT, INSERT ON sell_sec_03a_results TO anon, authenticated;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','03a-seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','03a-other-${ids.other}@test.invalid','{}','{}',now(),now());
INSERT INTO public.profiles(id,seller_type) VALUES ('${ids.seller}','private'),('${ids.other}','dealer') ON CONFLICT (id) DO UPDATE SET seller_type=EXCLUDED.seller_type;
INSERT INTO vehicle.makes(id,name,slug,is_active) VALUES ('${ids.make}','03A Make','03a-make-${ids.make}',true);
INSERT INTO vehicle.models(id,make_id,name,slug,is_active) VALUES ('${ids.model}','${ids.make}','03A Model','03a-model-${ids.model}',true),('${ids.otherModel}','${ids.make}','03A Other','03a-other-${ids.otherModel}',true);
INSERT INTO vehicle.variants(id,model_id,name,slug,is_active) VALUES ('${ids.variant}','${ids.model}','03A Variant','03a-variant-${ids.variant}',true);
INSERT INTO marketplace.cities(id,name,slug,is_active) VALUES ('${ids.city}','03A City','03a-city-${ids.city}',true),('${ids.otherCity}','03A Other City','03a-other-city-${ids.otherCity}',true);
INSERT INTO marketplace.districts(id,city_id,name,slug,is_active) VALUES ('${ids.district}','${ids.city}','03A District','03a-district-${ids.district}',true),('${ids.otherDistrict}','${ids.otherCity}','03A Other District','03a-other-district-${ids.otherDistrict}',true);
INSERT INTO sell_sec_03a_results VALUES
 ('anon create execute denied', NOT has_function_privilege('anon','public.create_own_listing_draft(uuid,uuid,uuid,smallint,integer,text,vehicle.fuel_type,vehicle.transmission_type,text,text,text,numeric,text,smallint,text,text,text,boolean,text,uuid,uuid)','EXECUTE'),'grant'),
 ('legacy listing insert remains granted', has_table_privilege('authenticated','marketplace.listings','INSERT'),'compatibility'),
 ('legacy media insert remains granted', has_table_privilege('authenticated','vehicle.profile_media','INSERT'),'compatibility');
${asRole("authenticated", ids.seller)}
CREATE TEMP TABLE created AS ${create()};
GRANT SELECT ON created TO authenticated;
RESET ROLE;
INSERT INTO sell_sec_03a_results SELECT 'owner create atomic pass',
  (SELECT count(*) FROM created)=1
  AND EXISTS (SELECT 1 FROM marketplace.listings AS listing WHERE listing.id=created.listing_id AND listing.seller_id='${ids.seller}'::uuid)
  AND EXISTS (SELECT 1 FROM vehicle.profile_ownership AS ownership WHERE ownership.vehicle_profile_id=created.vehicle_profile_id AND ownership.owner_id='${ids.seller}'::uuid AND ownership.is_current),
  'owner-derived rows' FROM created;
INSERT INTO sell_sec_03a_results SELECT 'safe result shape', NOT EXISTS (SELECT 1 FROM jsonb_object_keys(to_jsonb(created)) AS key WHERE key IN ('seller_id','storage_path','vin')), 'minimal columns' FROM created LIMIT 1;
${asRole("authenticated", ids.seller)}
DO $do$ BEGIN BEGIN PERFORM public.create_own_listing_draft('${ids.make}'::uuid,'${ids.otherModel}'::uuid,'${ids.variant}'::uuid,2024::smallint,100,'used'::text,'gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL::text,NULL::text,NULL::text,1.6,'unknown'::text,NULL::smallint,NULL::text,'100000'::text,'TRY'::text,false,'x'::text,NULL::uuid,NULL::uuid); INSERT INTO sell_sec_03a_results VALUES ('cross-model variant denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO sell_sec_03a_results VALUES ('cross-model variant denied',true,SQLERRM); END; END $do$;
DO $do$ BEGIN BEGIN PERFORM public.create_own_listing_draft('${ids.make}'::uuid,'${ids.model}'::uuid,NULL::uuid,2024::smallint,100,'used'::text,'gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL::text,NULL::text,NULL::text,1.6,'unknown'::text,NULL::smallint,NULL::text,'100000'::text,'TRY'::text,false,'x'::text,'${ids.city}'::uuid,'${ids.otherDistrict}'::uuid); INSERT INTO sell_sec_03a_results VALUES ('cross-city district denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO sell_sec_03a_results VALUES ('cross-city district denied',true,SQLERRM); END; END $do$;
DO $do$ BEGIN BEGIN PERFORM public.create_own_listing_draft('${ids.make}'::uuid,'${ids.model}'::uuid,NULL::uuid,2024::smallint,100,'used'::text,'gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL::text,NULL::text,NULL::text,1.6,'unknown'::text,NULL::smallint,NULL::text,'0'::text,'TRY'::text,false,'x'::text,NULL::uuid,NULL::uuid); INSERT INTO sell_sec_03a_results VALUES ('invalid price denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO sell_sec_03a_results VALUES ('invalid price denied',true,SQLERRM); END; END $do$;
RESET ROLE;
CREATE FUNCTION pg_temp.fail_03a_listing_insert() RETURNS trigger LANGUAGE plpgsql AS $trigger$ BEGIN IF NEW.city='__03A_FORCE_LATE_FAILURE__' THEN RAISE EXCEPTION 'forced late failure' USING ERRCODE='OT422'; END IF; RETURN NEW; END; $trigger$;
CREATE TRIGGER sell_sec_03a_force_late_failure BEFORE INSERT ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_03a_listing_insert();
${asRole("authenticated", ids.seller)}
DO $do$ BEGIN BEGIN PERFORM public.create_own_listing_draft('${ids.make}'::uuid,'${ids.model}'::uuid,NULL::uuid,2024::smallint,100,'used'::text,'gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL::text,NULL::text,NULL::text,1.6,'unknown'::text,NULL::smallint,NULL::text,'100000'::text,'TRY'::text,false,'__03A_FORCE_LATE_FAILURE__'::text,NULL::uuid,NULL::uuid); INSERT INTO sell_sec_03a_results VALUES ('forced late listing failure denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO sell_sec_03a_results VALUES ('forced late listing failure denied',true,SQLERRM); END; END $do$;
RESET ROLE;
DROP TRIGGER sell_sec_03a_force_late_failure ON marketplace.listings;
INSERT INTO sell_sec_03a_results SELECT 'late failure leaves no residue', count(*)=0, 'profile, ownership, and listing rolled back' FROM vehicle.vehicle_profiles WHERE created_by='${ids.seller}'::uuid AND NOT EXISTS (SELECT 1 FROM marketplace.listings AS listing WHERE listing.vehicle_profile_id=vehicle_profiles.id) AND NOT EXISTS (SELECT 1 FROM vehicle.profile_ownership AS ownership WHERE ownership.vehicle_profile_id=vehicle_profiles.id);
SELECT set_config('sellsec03a.listing_id',(SELECT listing_id::text FROM created),true); SELECT set_config('sellsec03a.vehicle_id',(SELECT vehicle_profile_id::text FROM created),true);
INSERT INTO storage.objects(bucket_id,name,owner,owner_id,metadata) VALUES
 ('listing-media','${ids.seller}/prod04a-2026082801/'||current_setting('sellsec03a.vehicle_id')||'/${ids.media}/original/original.webp','${ids.seller}','${ids.seller}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${ids.other}/prod04a-2026082801/'||current_setting('sellsec03a.vehicle_id')||'/${ids.foreignMedia}/original/original.webp','${ids.other}','${ids.other}','{"mimetype":"image/webp","size":1}');
${asRole("authenticated", ids.seller)}
CREATE TEMP TABLE attached AS SELECT * FROM public.attach_own_listing_media(current_setting('sellsec03a.listing_id')::uuid,'${ids.media}'::uuid,'${ids.seller}/prod04a-2026082801/'||current_setting('sellsec03a.vehicle_id')||'/${ids.media}/original/original.webp','${ids.seller}/prod04a-2026082801/'||current_setting('sellsec03a.vehicle_id')||'/${ids.media}/original/original.webp',NULL::text,NULL::text,NULL::text,0::smallint,true,NULL::integer,NULL::integer,NULL::numeric,'image/webp'::text,1::bigint,'processed'::text);
GRANT SELECT ON attached TO authenticated;
RESET ROLE;
INSERT INTO sell_sec_03a_results SELECT 'owner media attach and cover pass',
  count(*)=1 AND EXISTS (SELECT 1 FROM marketplace.listings AS listing WHERE listing.id=current_setting('sellsec03a.listing_id')::uuid AND listing.cover_media_id='${ids.media}'::uuid),
  'bound and cover persisted' FROM attached;
${asRole("authenticated", ids.seller)}
INSERT INTO sell_sec_03a_results SELECT 'duplicate media idempotent',count(*)=1,'same media id' FROM public.attach_own_listing_media(current_setting('sellsec03a.listing_id')::uuid,'${ids.media}'::uuid,'forged'::text,NULL::text,NULL::text,NULL::text,NULL::text,9::smallint,false);
DO $do$ BEGIN BEGIN PERFORM public.attach_own_listing_media(current_setting('sellsec03a.listing_id')::uuid,'${ids.foreignMedia}'::uuid,'${ids.other}/prod04a-2026082801/'||current_setting('sellsec03a.vehicle_id')||'/${ids.foreignMedia}/original/original.webp',NULL::text,NULL::text,NULL::text,NULL::text,1::smallint,false); INSERT INTO sell_sec_03a_results VALUES ('cross-owner attach denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO sell_sec_03a_results VALUES ('cross-owner attach denied',true,SQLERRM); END; END $do$;
DO $do$ BEGIN BEGIN PERFORM public.attach_own_listing_media(current_setting('sellsec03a.listing_id')::uuid,'${ids.foreignMedia}'::uuid,'${ids.seller}/prod04a-2026082801/'||current_setting('sellsec03a.vehicle_id')||'/${ids.foreignMedia}/original/missing.webp',NULL::text,NULL::text,NULL::text,NULL::text,1::smallint,false); INSERT INTO sell_sec_03a_results VALUES ('arbitrary path spoof denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO sell_sec_03a_results VALUES ('arbitrary path spoof denied',true,SQLERRM); END; END $do$;
${asRole("authenticated", ids.other)}
DO $do$ BEGIN BEGIN PERFORM public.attach_own_listing_media(current_setting('sellsec03a.listing_id')::uuid,'${ids.foreignMedia}'::uuid,'x'::text,NULL::text,NULL::text,NULL::text,NULL::text,1::smallint,false); INSERT INTO sell_sec_03a_results VALUES ('other user listing attach denied',false,'unexpected'); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO sell_sec_03a_results VALUES ('other user listing attach denied',true,SQLERRM); END; END $do$;
RESET ROLE;
SELECT name,ok,detail FROM sell_sec_03a_results ORDER BY name;
ROLLBACK;`;

const results = query(sql).split("\n").filter((line) => line.includes("|")).map((line) => { const [name, ok, detail] = line.split("|"); return { name, ok: ok === "t", detail }; });
const failures = results.filter((result) => !result.ok);
assert.deepEqual(failures, [], `SELL-SEC-03A runtime failures: ${JSON.stringify(failures, null, 2)}`);
console.log(`SELL-SEC-03A runtime authorization matrix passed (${results.length} checks).`);
for (const result of results) console.log(`PASS ${result.name}: ${result.detail}`);
