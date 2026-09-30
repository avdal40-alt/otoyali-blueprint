const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const mediaMigration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20260923202053_media_sec_01_sanitized_public_photo_contract.sql"), "utf8");
const finalizationMigration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20260924195959_media_sec_01d_fix_sanitized_finalize_blur_status.sql"), "utf8");
const mediaRoute = fs.readFileSync(path.join(projectRoot, "src", "app", "api", "listings", "[id]", "media", "route.ts"), "utf8");
const trustedStorage = fs.readFileSync(path.join(projectRoot, "src", "lib", "supabase", "trusted-storage.ts"), "utf8");

for (const required of ["CREATE POLICY listing_media_insert_temp_own", "(storage.foldername(name))[1] = 'temp'", "(storage.foldername(name))[2] = auth.uid()::TEXT", "CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo", "owner_id IS NULL", "privacy_version=1", "TO authenticated"]) {
  assert.ok(mediaMigration.includes(required), `MEDIA-SEC-01 contract must include: ${required}`);
}
assert.match(finalizationMigration, /'processed','blurred',1,now\(\)/);
assert.match(mediaRoute, /trustedSanitizedStorage\.upload/);
assert.match(mediaRoute, /finalize_own_listing_sanitized_photo/);
assert.match(mediaRoute, /storage\.from\("listing-media"\)\.remove\(\[payload\.tempPath\]\)/);
assert.match(trustedStorage, /import "server-only"/);

const studioUrl = process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323";
const parsedStudioUrl = new URL(studioUrl);
assert.ok(["127.0.0.1", "localhost"].includes(parsedStudioUrl.hostname), "PROD-04C runtime test is local-only");
const queryUrl = new URL("/api/platform/pg-meta/default/query", parsedStudioUrl);
async function query(sql) {
  const response = await fetch(queryUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const body = await response.text();
  if (!response.ok) throw new Error(`Local SQL failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : [];
}

const ids = { userA: crypto.randomUUID(), userB: crypto.randomUUID(), profileA: crypto.randomUUID(), profileB: crypto.randomUUID(), listingA: crypto.randomUUID(), listingB: crypto.randomUUID(), mediaA: crypto.randomUUID(), mediaB: crypto.randomUUID() };
const tempA = `temp/${ids.userA}/${ids.mediaA}/source.webp`;
const tempB = `temp/${ids.userB}/${ids.mediaB}/source.webp`;
const legacyPath = `${ids.userA}/prod04a-2026082801/${ids.profileA}/${ids.mediaA}/original/original.webp`;
const base = `public/${ids.profileA}/${ids.mediaA}`;
const variants = { master: `${base}/master.webp`, large: `${base}/large.webp`, card: `${base}/card.webp`, thumb: `${base}/thumb.webp` };
const cleanupSql = `
UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM vehicle.profile_media WHERE id IN ('${ids.mediaA}','${ids.mediaB}');
DELETE FROM marketplace.listings WHERE id IN ('${ids.listingA}','${ids.listingB}');
DELETE FROM vehicle.profile_ownership WHERE vehicle_profile_id IN ('${ids.profileA}','${ids.profileB}');
DELETE FROM vehicle.vehicle_profiles WHERE id IN ('${ids.profileA}','${ids.profileB}');
DELETE FROM storage.objects WHERE bucket_id='listing-media' AND name IN ('${tempA}','${tempB}','${legacyPath}','${variants.master}','${variants.large}','${variants.card}','${variants.thumb}');
DELETE FROM public.profiles WHERE id IN ('${ids.userA}','${ids.userB}');
DELETE FROM auth.users WHERE id IN ('${ids.userA}','${ids.userB}');
`;

const runtimeSql = `
CREATE TEMP TABLE prod04c_results(test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT) ON COMMIT DROP;
GRANT INSERT, SELECT ON prod04c_results TO anon, authenticated, service_role;
${cleanupSql}
INSERT INTO auth.users (id,phone,raw_app_meta_data,raw_user_meta_data,aud,role) VALUES
 ('${ids.userA}','+905550000021','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated'),
 ('${ids.userB}','+905550000022','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated');
INSERT INTO public.profiles (id,phone,full_name,display_name,city,seller_type) VALUES
 ('${ids.userA}','+905550000021','PROD-04C User A','PROD-04C User A','Adana','private'),
 ('${ids.userB}','+905550000022','PROD-04C User B','PROD-04C User B','Adana','private')
ON CONFLICT (id) DO UPDATE SET phone=EXCLUDED.phone, full_name=EXCLUDED.full_name, display_name=EXCLUDED.display_name, city=EXCLUDED.city, seller_type=EXCLUDED.seller_type;
INSERT INTO vehicle.vehicle_profiles (id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_by) VALUES
 ('${ids.profileA}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userA}'),
 ('${ids.profileB}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userB}');
INSERT INTO vehicle.profile_ownership (vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.profileA}','${ids.userA}','owner',true), ('${ids.profileB}','${ids.userB}','owner',true);
INSERT INTO marketplace.listings (id,vehicle_profile_id,seller_id,status,title,price_amount,city,moderation_status,seller_type) VALUES
 ('${ids.listingA}','${ids.profileA}','${ids.userA}','draft','Sanitized fixture A',100000,'Adana','pending_review','private'),
 ('${ids.listingB}','${ids.profileB}','${ids.userB}','draft','Sanitized fixture B',100000,'Adana','pending_review','private');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userA}","role":"authenticated"}',true);
INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES ('listing-media','${tempA}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}');
INSERT INTO prod04c_results VALUES ('owner temp upload allowed',true,'temp owner path accepted');
DO $do$ BEGIN BEGIN
  INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES ('listing-media','${legacyPath}','${ids.userA}','${ids.userA}','{"size":1}');
  INSERT INTO prod04c_results VALUES ('legacy browser write denied',false,'unexpectedly allowed');
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO prod04c_results VALUES ('legacy browser write denied',true,SQLERRM); END; END $do$;
DO $do$ BEGIN BEGIN
  INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES ('listing-media','${variants.large}','${ids.userA}','${ids.userA}','{"size":1}');
  INSERT INTO prod04c_results VALUES ('public browser write denied',false,'unexpectedly allowed');
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO prod04c_results VALUES ('public browser write denied',true,SQLERRM); END; END $do$;
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES
 ('listing-media','${variants.master}',NULL,NULL,'{"mimetype":"image/webp","size":1}'), ('listing-media','${variants.large}',NULL,NULL,'{"mimetype":"image/webp","size":1}'),
 ('listing-media','${variants.card}',NULL,NULL,'{"mimetype":"image/webp","size":1}'), ('listing-media','${variants.thumb}',NULL,NULL,'{"mimetype":"image/webp","size":1}');
INSERT INTO prod04c_results SELECT 'trusted sanitized fixture setup',count(*)=4,'trusted canonical variants='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name IN ('${variants.master}','${variants.large}','${variants.card}','${variants.thumb}') AND owner_id IS NULL;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userB}","role":"authenticated"}',true);
INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES ('listing-media','${tempB}','${ids.userB}','${ids.userB}','{"mimetype":"image/webp","size":1}');
DO $do$ BEGIN
  DELETE FROM storage.objects WHERE bucket_id='listing-media' AND name='${tempA}';
  INSERT INTO prod04c_results VALUES ('cross-owner temp removal denied',NOT FOUND,CASE WHEN FOUND THEN 'unexpectedly deleted' ELSE 'zero rows deleted' END);
END $do$;
DO $do$ BEGIN BEGIN
  PERFORM public.finalize_own_listing_sanitized_photo('${ids.listingA}'::uuid,'${ids.mediaA}'::uuid,'${tempA}'::text,'${variants.master}'::text,'${variants.large}'::text,'${variants.card}'::text,'${variants.thumb}'::text,0::smallint,true,100,50,2::numeric,'image/webp'::text,1::bigint);
  INSERT INTO prod04c_results VALUES ('cross-owner finalization denied',false,'unexpectedly allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO prod04c_results VALUES ('cross-owner finalization denied',true,SQLERRM); END; END $do$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userA}","role":"authenticated"}',true);
SELECT * FROM public.finalize_own_listing_sanitized_photo('${ids.listingA}'::uuid,'${ids.mediaA}'::uuid,'${tempA}'::text,'${variants.master}'::text,'${variants.large}'::text,'${variants.card}'::text,'${variants.thumb}'::text,0::smallint,true,100,50,2::numeric,'image/webp'::text,1::bigint);
INSERT INTO prod04c_results SELECT 'owner authenticated finalization',count(*)=1,'finalized='||count(*) FROM vehicle.profile_media WHERE id='${ids.mediaA}' AND vehicle_profile_id='${ids.profileA}' AND processed_status='processed' AND blur_status='blurred' AND privacy_version=1 AND original_path='${variants.master}' AND storage_path='${variants.large}' AND large_path='${variants.large}' AND card_path='${variants.card}' AND thumb_path='${variants.thumb}';
DELETE FROM storage.objects WHERE bucket_id='listing-media' AND name='${tempA}';
INSERT INTO prod04c_results SELECT 'owner temp cleanup allowed',count(*)=0,'remaining='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${tempA}';
DO $do$ BEGIN
  DELETE FROM storage.objects WHERE bucket_id='listing-media' AND name='${variants.large}';
  INSERT INTO prod04c_results VALUES ('canonical public removal denied',NOT FOUND,CASE WHEN FOUND THEN 'unexpectedly deleted' ELSE 'zero rows deleted' END);
END $do$;
RESET ROLE;

UPDATE marketplace.listings SET status='active',moderation_status='active',published_at=now() WHERE id='${ids.listingA}';
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
INSERT INTO prod04c_results SELECT 'sanitized public delivery allowed',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${variants.large}';
INSERT INTO prod04c_results SELECT 'temp never publicly delivered',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${tempB}';
RESET ROLE;
UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;
SELECT test,passed,detail FROM prod04c_results ORDER BY test;
`;

(async () => {
  await query(cleanupSql);
  try {
    const results = await query(runtimeSql);
    assert.ok(results.length >= 10, `expected PROD-04C runtime matrix, got ${results.length} rows`);
    assert.deepEqual(results.filter((result) => !result.passed), [], `PROD-04C runtime failures: ${JSON.stringify(results, null, 2)}`);
    console.log(`PROD-04C sanitized media release matrix passed (${results.length} checks).`);
  } finally {
    await query(cleanupSql).catch(() => {});
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
