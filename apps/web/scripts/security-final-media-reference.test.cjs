const assert = require("node:assert/strict");

const studioUrl = process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323";
const parsedStudioUrl = new URL(studioUrl);
assert.ok(["127.0.0.1", "localhost"].includes(parsedStudioUrl.hostname), "SFI-001 runtime test is local-only");

const queryUrl = new URL("/api/platform/pg-meta/default/query", parsedStudioUrl);

async function query(sql) {
  const response = await fetch(queryUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Local SQL failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : [];
}

const ids = {
  userA: "a0000000-0000-4000-8000-000000000011",
  userB: "b0000000-0000-4000-8000-000000000012",
  profileA1: "a1000000-0000-4000-8000-000000000011",
  profileA2: "a1000000-0000-4000-8000-000000000012",
  profileB: "b1000000-0000-4000-8000-000000000013",
  listingA1: "a2000000-0000-4000-8000-000000000011",
  listingA2: "a2000000-0000-4000-8000-000000000012",
  listingB: "b2000000-0000-4000-8000-000000000013",
  mediaA: "a4000000-0000-4000-8000-000000000011",
  mediaA2: "a4000000-0000-4000-8000-000000000012",
  mediaService: "a4000000-0000-4000-8000-000000000013",
  mediaLegacy: "a4000000-0000-4000-8000-000000000014"
};

const cleanupSql = `
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM vehicle.profile_media WHERE id IN ('${ids.mediaA}','${ids.mediaA2}','${ids.mediaService}','${ids.mediaLegacy}');
DELETE FROM marketplace.listings WHERE id IN ('${ids.listingA1}','${ids.listingA2}','${ids.listingB}');
DELETE FROM vehicle.profile_ownership WHERE vehicle_profile_id IN ('${ids.profileA1}','${ids.profileA2}','${ids.profileB}');
DELETE FROM vehicle.vehicle_profiles WHERE id IN ('${ids.profileA1}','${ids.profileA2}','${ids.profileB}');
DELETE FROM storage.objects WHERE name LIKE '${ids.userA}/sfi001/%' OR name LIKE '${ids.userB}/sfi001/%' OR name LIKE '${ids.userA}/%/${ids.mediaA}/%' OR name LIKE '${ids.userA}/%/${ids.mediaA2}/%' OR name LIKE '${ids.userA}/%/${ids.mediaService}/%' OR name LIKE '${ids.userB}/%/${ids.mediaA}/%';
DELETE FROM public.profiles WHERE id IN ('${ids.userA}','${ids.userB}');
DELETE FROM auth.users WHERE id IN ('${ids.userA}','${ids.userB}');
`;

const pathA = `${ids.userA}/${ids.profileA1}/${ids.mediaA}/original/original.webp`;
const pathAThumb = `${ids.userA}/${ids.profileA1}/${ids.mediaA}/thumb/thumb.webp`;
const pathA2 = `${ids.userA}/${ids.profileA2}/${ids.mediaA2}/original/original.webp`;
const pathB = `${ids.userB}/${ids.profileB}/${ids.mediaA}/original/original.webp`;
const pathBThumb = `${ids.userB}/${ids.profileB}/${ids.mediaA}/thumb/thumb.webp`;
const pathBLarge = `${ids.userB}/${ids.profileB}/${ids.mediaA}/large/large.webp`;
const pathBCard = `${ids.userB}/${ids.profileB}/${ids.mediaA}/card/card.webp`;
const pathServiceA = `${ids.userA}/${ids.profileA1}/${ids.mediaService}/original/original.webp`;
const orphanPath = `${ids.userA}/sfi001/orphan/original.webp`;
const legacyPath = `${ids.userA}/sfi001/legacy.webp`;

const runtimeSql = `
CREATE TEMP TABLE sfi001_results(test text PRIMARY KEY, passed boolean, detail text) ON COMMIT DROP;
GRANT INSERT, SELECT, UPDATE ON sfi001_results TO anon, authenticated, service_role;
${cleanupSql}

INSERT INTO auth.users (id,phone,raw_app_meta_data,raw_user_meta_data,aud,role) VALUES
 ('${ids.userA}','+905550000011','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated'),
 ('${ids.userB}','+905550000012','{"provider":"phone","providers":["phone"]}','{}','authenticated','authenticated');
INSERT INTO public.profiles (id,phone,full_name,display_name,city) VALUES
 ('${ids.userA}','+905550000011','SFI User A','SFI User A','Adana'),
 ('${ids.userB}','+905550000012','SFI User B','SFI User B','Adana')
ON CONFLICT (id) DO UPDATE SET
 phone=excluded.phone,
 full_name=excluded.full_name,
 display_name=excluded.display_name,
 city=excluded.city;
INSERT INTO vehicle.vehicle_profiles (id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_by) VALUES
 ('${ids.profileA1}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userA}'),
 ('${ids.profileA2}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userA}'),
 ('${ids.profileB}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userB}');
INSERT INTO vehicle.profile_ownership (vehicle_profile_id,owner_id,ownership_type,is_current) VALUES
 ('${ids.profileA1}','${ids.userA}','owner',true),('${ids.profileA2}','${ids.userA}','owner',true),('${ids.profileB}','${ids.userB}','owner',true);
INSERT INTO marketplace.listings (id,vehicle_profile_id,seller_id,status,title,price_amount,city,moderation_status,published_at) VALUES
 ('${ids.listingA1}','${ids.profileA1}','${ids.userA}','active','Approved A1',100000,'Adana','active',now()),
 ('${ids.listingA2}','${ids.profileA2}','${ids.userA}','draft','Draft A2',100000,'Adana','pending_review',NULL),
 ('${ids.listingB}','${ids.profileB}','${ids.userB}','draft','Draft B',100000,'Adana','pending_review',NULL);
INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES
 ('listing-media','${pathA}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathAThumb}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathA2}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathB}','${ids.userB}','${ids.userB}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathBThumb}','${ids.userB}','${ids.userB}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathBLarge}','${ids.userB}','${ids.userB}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathBCard}','${ids.userB}','${ids.userB}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${pathServiceA}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${orphanPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('vehicle-photos','${legacyPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userA}","role":"authenticated"}',true);
INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,thumb_path,sort_order,is_cover)
VALUES ('${ids.mediaA}','${ids.profileA1}','${pathA}','http://127.0.0.1:54321/storage/v1/object/authenticated/listing-media/${pathA}','${pathA}','${pathAThumb}',0,true);
INSERT INTO sfi001_results VALUES ('own object + own vehicle insert',true,'allowed');

DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.mediaA2}','${ids.profileA1}','${pathB}','x','${pathB}',1);
    INSERT INTO sfi001_results VALUES ('foreign insert denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('foreign insert denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    UPDATE vehicle.profile_media SET storage_path='${pathB}', original_path='${pathB}' WHERE id='${ids.mediaA}';
    INSERT INTO sfi001_results VALUES ('foreign update denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('foreign update denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    UPDATE vehicle.profile_media SET sort_order=7, thumb_path='${pathBThumb}' WHERE id='${ids.mediaA}';
    INSERT INTO sfi001_results VALUES ('mixed update denied atomically',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results
    SELECT 'mixed update denied atomically',sort_order=0,'sort_order='||sort_order FROM vehicle.profile_media WHERE id='${ids.mediaA}';
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    UPDATE vehicle.profile_media SET large_path='${pathBLarge}' WHERE id='${ids.mediaA}';
    INSERT INTO sfi001_results VALUES ('foreign large_path update denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('foreign large_path update denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    UPDATE vehicle.profile_media SET card_path='${pathBCard}' WHERE id='${ids.mediaA}';
    INSERT INTO sfi001_results VALUES ('foreign card_path update denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('foreign card_path update denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.mediaA}','${ids.profileA1}','${pathB}','x','${pathB}',0)
    ON CONFLICT (id) DO UPDATE SET storage_path=excluded.storage_path,original_path=excluded.original_path;
    INSERT INTO sfi001_results VALUES ('foreign upsert denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('foreign upsert denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.mediaA2}','${ids.profileA1}','${pathA2}','x','${pathA2}',1);
    INSERT INTO sfi001_results VALUES ('same-user cross-vehicle denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('same-user cross-vehicle denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.mediaA2}','${ids.profileA1}','${orphanPath}','x','${orphanPath}',1);
    INSERT INTO sfi001_results VALUES ('orphan/wrong-context object denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('orphan/wrong-context object denied',true,SQLERRM);
  END;
END $do$;

DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.mediaA2}','${ids.profileA1}','${ids.userA}/${ids.profileA1}/${ids.mediaA2}/original/missing.webp','x','${ids.userA}/${ids.profileA1}/${ids.mediaA2}/original/missing.webp',1);
    INSERT INTO sfi001_results VALUES ('nonexistent object denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('nonexistent object denied',true,SQLERRM);
  END;
END $do$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userB}","role":"authenticated"}',true);
DO $do$ BEGIN
  UPDATE vehicle.profile_media SET sort_order=9 WHERE id='${ids.mediaA}';
  INSERT INTO sfi001_results VALUES ('USER_B modifying USER_A denied',NOT FOUND,'affected rows='||(CASE WHEN FOUND THEN 1 ELSE 0 END));
END $do$;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,sort_order)
    VALUES ('${ids.mediaA2}','${ids.profileA1}','${pathA2}','x',1);
    INSERT INTO sfi001_results VALUES ('anonymous mutation denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('anonymous mutation denied',true,SQLERRM);
  END;
END $do$;
INSERT INTO sfi001_results SELECT 'approved public legitimate media',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${pathA}';
INSERT INTO sfi001_results SELECT 'anonymous foreign unpublished denied',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${pathB}';
INSERT INTO sfi001_results SELECT 'draft same-user media denied',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${pathA2}';
INSERT INTO sfi001_results SELECT 'orphan object private',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${orphanPath}';
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userA}","role":"authenticated"}',true);
INSERT INTO sfi001_results SELECT 'USER_A direct USER_B unpublished denied',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${pathB}';
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userB}","role":"authenticated"}',true);
INSERT INTO sfi001_results SELECT 'owner USER_B unpublished access',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${pathB}';
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
VALUES ('${ids.mediaService}','${ids.profileA1}','${pathB}','service','${pathB}',2);
INSERT INTO sfi001_results VALUES ('service_role trusted mutation',true,'allowed intentionally');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userA}","role":"authenticated"}',true);
DO $do$ BEGIN
  BEGIN
    UPDATE vehicle.profile_media SET storage_path='${pathServiceA}' WHERE id='${ids.mediaService}';
    INSERT INTO sfi001_results VALUES ('single-path repair cannot retain foreign sibling',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO sfi001_results VALUES ('single-path repair cannot retain foreign sibling',true,SQLERRM);
  END;
END $do$;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
INSERT INTO sfi001_results SELECT 'service foreign link not publicly trusted',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${pathB}';
RESET ROLE;

INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,sort_order,is_cover)
VALUES ('${ids.mediaLegacy}','${ids.profileA1}','${legacyPath}','legacy',3,false);
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
INSERT INTO sfi001_results SELECT 'approved legacy vehicle-photos media',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='vehicle-photos' AND name='${legacyPath}';
RESET ROLE;

SELECT test,passed,detail FROM sfi001_results ORDER BY test;
`;

(async () => {
  await query(cleanupSql);
  try {
    const results = await query(runtimeSql);
    assert.ok(results.length >= 17, `expected runtime matrix, got ${results.length} rows`);
    const failures = results.filter((result) => !result.passed);
    assert.deepEqual(failures, [], `SFI-001 runtime failures: ${JSON.stringify(failures, null, 2)}`);
    console.log(`SECURITY-FINAL-R1 runtime authorization matrix passed (${results.length} checks).`);
    for (const result of results) console.log(`PASS ${result.test}: ${result.detail}`);
  } finally {
    await query(cleanupSql);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
