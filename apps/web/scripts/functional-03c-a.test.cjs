const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260923061628_functional_03c_a_video_security_lifecycle_contract.sql"), "utf8");
const correction = fs.readFileSync(path.join(root, "supabase/migrations/20260923062012_functional_03c_a_galeri_video_search_sync.sql"), "utf8");
for (const token of ["listing_videos_one_current_slot_per_listing_idx", "public.is_verified_galeri", "attach_own_listing_video", "replace_own_listing_video", "remove_own_listing_video", "REVOKE INSERT, UPDATE, DELETE ON marketplace.listing_videos FROM authenticated", "listing_videos_storage_insert_own_listing", "is_listing_video_publicly_eligible", "has_video=EXCLUDED.has_video"]) assert.ok(migration.includes(token), token);
assert.match(correction, /galeri_verification_video_search_sync/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "individual", "other", "listing", "otherListing", "vehicle", "otherVehicle", "make", "model"].map((key) => [key, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const mediaPath = (owner, listing, name) => `${owner}/prod04a-2026082801/${listing}/${name}`;

const sql = `BEGIN;
CREATE TEMP TABLE results(name text primary key, ok boolean not null) ON COMMIT DROP; GRANT SELECT, INSERT ON results TO anon, authenticated, service_role;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','video-dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.individual}','authenticated','authenticated','video-individual-${ids.individual}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','video-other-${ids.other}@test.invalid','{}','{}',now(),now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type='dealer' WHERE id IN ('${ids.dealer}','${ids.other}');
INSERT INTO marketplace.galeri_verifications(dealer_id,status,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified',now(),'${ids.dealer}'),('${ids.other}','verified',now(),'${ids.other}');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','Video Make','video-make-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','Video Model','video-model-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES
('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.dealer}'),
('${ids.otherVehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.other}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true),('${ids.otherVehicle}','${ids.other}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES
('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','Video listing',100000,'TRY',false,'Istanbul','dealer'),
('${ids.otherListing}','${ids.otherVehicle}','${ids.other}','active','active','Other listing',100000,'TRY',false,'Istanbul','dealer');
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES ('listing-videos','${mediaPath(ids.dealer, ids.listing, "first.mp4")}','${ids.dealer}'),('listing-videos','${mediaPath(ids.dealer, ids.listing, "second.mp4")}','${ids.dealer}');
INSERT INTO results VALUES ('direct dml revoked', NOT has_table_privilege('authenticated','marketplace.listing_videos','INSERT,UPDATE,DELETE'));
${role("authenticated", ids.individual)}
DO $$ BEGIN BEGIN PERFORM public.attach_own_listing_video('${ids.listing}','${mediaPath(ids.individual, ids.listing, "individual.mp4")}','x',NULL,10); INSERT INTO results VALUES ('legacy attach denied',false); EXCEPTION WHEN SQLSTATE '42501' THEN INSERT INTO results VALUES ('legacy attach denied',true); END; END $$;
${role("authenticated", ids.other)}
DO $$ BEGIN BEGIN PERFORM public.replace_own_listing_video('${ids.listing}','${mediaPath(ids.other, ids.listing, "cross.mp4")}','x',NULL,10); INSERT INTO results VALUES ('legacy replace denied',false); EXCEPTION WHEN SQLSTATE '42501' THEN INSERT INTO results VALUES ('legacy replace denied',true); END; END $$;
${role("authenticated", ids.dealer)}
DO $$ BEGIN BEGIN PERFORM public.attach_own_listing_video('${ids.listing}','${mediaPath(ids.dealer, ids.listing, "first.mp4")}','first',NULL,10); INSERT INTO results VALUES ('owner legacy attach denied',false); EXCEPTION WHEN SQLSTATE '42501' THEN INSERT INTO results VALUES ('owner legacy attach denied',true); END; END $$;
SET LOCAL ROLE service_role;
INSERT INTO marketplace.listing_videos(listing_id,seller_user_id,title,video_url,original_video_url,storage_path,duration_seconds,status,visibility,processing_status,blur_status,moderation_status,is_current) VALUES ('${ids.listing}','${ids.dealer}','first','${mediaPath(ids.dealer, ids.listing, "first.mp4")}','${mediaPath(ids.dealer, ids.listing, "first.mp4")}','${mediaPath(ids.dealer, ids.listing, "first.mp4")}',10,'pending_review','private','pending','not_started','pending_review',true);
INSERT INTO results VALUES ('verified own attach', EXISTS(SELECT 1 FROM marketplace.listing_videos WHERE listing_id='${ids.listing}' AND is_current AND status='pending_review'));
UPDATE marketplace.listing_videos SET status='active',visibility='public',moderation_status='approved' WHERE listing_id='${ids.listing}';
INSERT INTO results VALUES ('eligible video makes search true', (SELECT has_video FROM marketplace.listing_search_documents WHERE listing_id='${ids.listing}'));
UPDATE marketplace.galeri_verifications SET status='rejected' WHERE dealer_id='${ids.dealer}';
INSERT INTO results VALUES ('verification loss hides video', NOT marketplace.is_listing_video_publicly_eligible((SELECT id FROM marketplace.listing_videos WHERE listing_id='${ids.listing}')));
INSERT INTO results VALUES ('verification loss refreshes search', NOT (SELECT has_video FROM marketplace.listing_search_documents WHERE listing_id='${ids.listing}'));
SELECT name,ok FROM results ORDER BY name; ROLLBACK;`;
const results = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(results.filter(([, ok]) => ok !== "t"), [], JSON.stringify(results));
console.log(`FUNCTIONAL-03C-A video security/lifecycle matrix passed (${results.length} checks)`);
