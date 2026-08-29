const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationName = "20260829120000_security_final_media_release_path_compatibility.sql";
const migration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", migrationName), "utf8");
const compatibility = fs.readFileSync(path.join(projectRoot, "src", "lib", "release", "compatibility.ts"), "utf8");

for (const required of [
  "CREATE OR REPLACE FUNCTION vehicle.profile_media_path_matches(",
  "state.storage_release_segment",
  "cardinality(folders) = 4",
  "cardinality(folders) = 5",
  "folders[2] = storage_release_segment",
  "CREATE OR REPLACE FUNCTION vehicle.enforce_profile_media_reference_integrity()",
  "CREATE OR REPLACE FUNCTION vehicle.is_public_profile_media_object(",
  "SET search_path = pg_catalog",
  "COALESCE(object.owner_id, object.owner::TEXT) = actor::TEXT",
  "ownership.is_current = TRUE",
  "ownership.ended_at IS NULL",
  "listing.seller_id = ownership.owner_id",
  "listing.status = 'active'",
  "listing.moderation_status = 'active'",
  "REVOKE ALL ON FUNCTION vehicle.profile_media_path_matches",
  "TO anon, authenticated"
]) {
  assert.ok(migration.includes(required), `PROD-04C migration must include: ${required}`);
}
assert.ok(!migration.includes("prod04a-2026082801"), "database parser must use the authoritative stored release segment");
for (const variant of ["original", "large", "card", "thumb"]) {
  assert.ok(migration.includes(`'${variant}'`), `PROD-04C must bind ${variant} paths`);
}
assert.match(compatibility, /YOLMOD_STORAGE_RELEASE_SEGMENT = `prod04a-\$\{YOLMOD_RELEASE\}`/);
assert.match(compatibility, /return \[userId, YOLMOD_STORAGE_RELEASE_SEGMENT, \.\.\.segments\]\.join\("\/"\)/);

const studioUrl = process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323";
const parsedStudioUrl = new URL(studioUrl);
assert.ok(["127.0.0.1", "localhost"].includes(parsedStudioUrl.hostname), "PROD-04C runtime test is local-only");
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
  userA: "c0000000-0000-4000-8000-000000000011",
  userB: "d0000000-0000-4000-8000-000000000012",
  profileA1: "c1000000-0000-4000-8000-000000000011",
  profileA2: "c1000000-0000-4000-8000-000000000012",
  profileB: "d1000000-0000-4000-8000-000000000013",
  listingA1: "c2000000-0000-4000-8000-000000000011",
  listingA2: "c2000000-0000-4000-8000-000000000012",
  listingB: "d2000000-0000-4000-8000-000000000013",
  legacyApproved: "c3000000-0000-4000-8000-000000000011",
  releaseApproved: "c3000000-0000-4000-8000-000000000012",
  releaseDraft: "c3000000-0000-4000-8000-000000000013",
  foreignMedia: "d3000000-0000-4000-8000-000000000014",
  crossVehicle: "c3000000-0000-4000-8000-000000000015",
  nonexistent: "c3000000-0000-4000-8000-000000000016",
  malformed: "c3000000-0000-4000-8000-000000000017",
  forged: "c3000000-0000-4000-8000-000000000018",
  extra: "c3000000-0000-4000-8000-000000000019",
  wrongMedia: "c3000000-0000-4000-8000-000000000020",
  otherMedia: "c3000000-0000-4000-8000-000000000021"
};

const releaseSegment = "prod04a-2026082801";
const legacyPath = `${ids.userA}/${ids.profileA1}/${ids.legacyApproved}/original/original.webp`;
const legacyDraftPath = `${ids.userA}/${ids.profileA2}/${ids.releaseDraft}/original/legacy-draft.webp`;
const releaseOriginal = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.releaseApproved}/original/original.webp`;
const releaseLarge = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.releaseApproved}/large/large.webp`;
const releaseCard = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.releaseApproved}/card/card.webp`;
const releaseCardV2 = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.releaseApproved}/card/card-v2.webp`;
const releaseThumb = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.releaseApproved}/thumb/thumb.webp`;
const releaseDraft = `${ids.userA}/${releaseSegment}/${ids.profileA2}/${ids.releaseDraft}/original/original.webp`;
const foreignPath = `${ids.userB}/${releaseSegment}/${ids.profileB}/${ids.foreignMedia}/original/original.webp`;
const crossVehiclePath = `${ids.userA}/${releaseSegment}/${ids.profileA2}/${ids.crossVehicle}/original/original.webp`;
const nonexistentPath = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.nonexistent}/original/missing.webp`;
const malformedPath = `${ids.userA}/prod04a-latest/${ids.profileA1}/${ids.malformed}/original/original.webp`;
const forgedPath = `${ids.userA}/prod04a-2026082802/${ids.profileA1}/${ids.forged}/original/original.webp`;
const extraPath = `${ids.userA}/${releaseSegment}/extra/${ids.profileA1}/${ids.extra}/original/original.webp`;
const wrongMediaPath = `${ids.userA}/${releaseSegment}/${ids.profileA1}/${ids.otherMedia}/original/original.webp`;

const allMediaIds = Object.values(ids).filter((value, index) => index >= 8);
const cleanupSql = `
UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM vehicle.profile_media WHERE id IN (${allMediaIds.map((id) => `'${id}'`).join(",")});
DELETE FROM marketplace.listings WHERE id IN ('${ids.listingA1}','${ids.listingA2}','${ids.listingB}');
DELETE FROM vehicle.profile_ownership WHERE vehicle_profile_id IN ('${ids.profileA1}','${ids.profileA2}','${ids.profileB}');
DELETE FROM vehicle.vehicle_profiles WHERE id IN ('${ids.profileA1}','${ids.profileA2}','${ids.profileB}');
DELETE FROM storage.objects WHERE name LIKE '${ids.userA}/%' OR name LIKE '${ids.userB}/%';
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
ON CONFLICT (id) DO UPDATE SET
 phone=excluded.phone,
 full_name=excluded.full_name,
 display_name=excluded.display_name,
 city=excluded.city,
 seller_type=excluded.seller_type;
INSERT INTO vehicle.vehicle_profiles (id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_by) VALUES
 ('${ids.profileA1}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userA}'),
 ('${ids.profileA2}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userA}'),
 ('${ids.profileB}',(SELECT make_id FROM vehicle.models ORDER BY id LIMIT 1),(SELECT id FROM vehicle.models ORDER BY id LIMIT 1),2024,100,'gasoline','automatic','${ids.userB}');
INSERT INTO vehicle.profile_ownership (vehicle_profile_id,owner_id,ownership_type,is_current) VALUES
 ('${ids.profileA1}','${ids.userA}','owner',true),
 ('${ids.profileA2}','${ids.userA}','owner',true),
 ('${ids.profileB}','${ids.userB}','owner',true);
INSERT INTO marketplace.listings (id,vehicle_profile_id,seller_id,status,title,price_amount,city,moderation_status,published_at,seller_type) VALUES
 ('${ids.listingA1}','${ids.profileA1}','${ids.userA}','active','Approved release media',100000,'Adana','active',now(),'private'),
 ('${ids.listingA2}','${ids.profileA2}','${ids.userA}','draft','Draft release media',100000,'Adana','pending_review',NULL,'private'),
 ('${ids.listingB}','${ids.profileB}','${ids.userB}','draft','Foreign draft media',100000,'Adana','pending_review',NULL,'private');

INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES
 ('listing-media','${legacyPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${legacyDraftPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${foreignPath}','${ids.userB}','${ids.userB}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${crossVehiclePath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${malformedPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${forgedPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${extraPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${wrongMediaPath}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}');

INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order,is_cover)
VALUES ('${ids.legacyApproved}','${ids.profileA1}','${legacyPath}','legacy','${legacyPath}',0,true);
INSERT INTO prod04c_results VALUES ('legacy valid owner-bound insert',true,'allowed');

UPDATE public.release_compatibility_state SET mode='enforce_minimum', updated_at=now() WHERE singleton;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userA}","role":"authenticated"}',true);
INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata) VALUES
 ('listing-media','${releaseOriginal}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${releaseLarge}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${releaseCard}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${releaseCardV2}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${releaseThumb}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}'),
 ('listing-media','${releaseDraft}','${ids.userA}','${ids.userA}','{"mimetype":"image/webp","size":1}');
INSERT INTO prod04c_results VALUES ('candidate release Storage upload',true,'release-gated RLS allowed canonical paths');
INSERT INTO prod04c_results
SELECT 'release Storage owner binding',count(*)=6,'owned='||count(*)
FROM storage.objects
WHERE name IN ('${releaseOriginal}','${releaseLarge}','${releaseCard}','${releaseCardV2}','${releaseThumb}','${releaseDraft}')
  AND COALESCE(owner_id,owner::TEXT)='${ids.userA}';

DO $do$ BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id,name,owner,owner_id,metadata)
    VALUES ('listing-media','${ids.userB}/${releaseSegment}/${ids.profileB}/${ids.foreignMedia}/thumb/forged.webp','${ids.userB}','${ids.userB}','{"size":1}');
    INSERT INTO prod04c_results VALUES ('foreign release Storage folder denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('foreign release Storage folder denied',true,SQLERRM);
  END;
END $do$;

INSERT INTO vehicle.profile_media (
 id,vehicle_profile_id,storage_path,url,original_path,large_path,card_path,thumb_path,sort_order,is_cover
) VALUES (
 '${ids.releaseApproved}','${ids.profileA1}','${releaseLarge}','release',
 '${releaseOriginal}','${releaseLarge}','${releaseCard}','${releaseThumb}',1,false
);
INSERT INTO prod04c_results VALUES ('release profile_media insert all variants',true,'allowed');
UPDATE vehicle.profile_media SET card_path='${releaseCardV2}' WHERE id='${ids.releaseApproved}';
INSERT INTO prod04c_results VALUES ('release profile_media update',true,'allowed');

INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
VALUES ('${ids.releaseDraft}','${ids.profileA2}','${releaseDraft}','draft','${releaseDraft}',0);
INSERT INTO prod04c_results VALUES ('release unpublished owner insert',true,'allowed');

DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.foreignMedia}','${ids.profileA1}','${foreignPath}','x','${foreignPath}',2);
    INSERT INTO prod04c_results VALUES ('release foreign reference denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('release foreign reference denied',true,SQLERRM);
  END;
END $do$;
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.crossVehicle}','${ids.profileA1}','${crossVehiclePath}','x','${crossVehiclePath}',2);
    INSERT INTO prod04c_results VALUES ('release same-user cross-vehicle denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('release same-user cross-vehicle denied',true,SQLERRM);
  END;
END $do$;
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.nonexistent}','${ids.profileA1}','${nonexistentPath}','x','${nonexistentPath}',2);
    INSERT INTO prod04c_results VALUES ('release nonexistent object denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('release nonexistent object denied',true,SQLERRM);
  END;
END $do$;
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.malformed}','${ids.profileA1}','${malformedPath}','x','${malformedPath}',2);
    INSERT INTO prod04c_results VALUES ('malformed release segment denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('malformed release segment denied',true,SQLERRM);
  END;
END $do$;
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.forged}','${ids.profileA1}','${forgedPath}','x','${forgedPath}',2);
    INSERT INTO prod04c_results VALUES ('forged release segment denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('forged release segment denied',true,SQLERRM);
  END;
END $do$;
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.extra}','${ids.profileA1}','${extraPath}','x','${extraPath}',2);
    INSERT INTO prod04c_results VALUES ('forged extra component denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('forged extra component denied',true,SQLERRM);
  END;
END $do$;
DO $do$ BEGIN
  BEGIN
    INSERT INTO vehicle.profile_media (id,vehicle_profile_id,storage_path,url,original_path,sort_order)
    VALUES ('${ids.wrongMedia}','${ids.profileA1}','${wrongMediaPath}','x','${wrongMediaPath}',2);
    INSERT INTO prod04c_results VALUES ('release wrong media id denied',false,'unexpectedly allowed');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO prod04c_results VALUES ('release wrong media id denied',true,SQLERRM);
  END;
END $do$;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
INSERT INTO prod04c_results SELECT 'legacy approved public helper',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${legacyPath}';
INSERT INTO prod04c_results SELECT 'release approved public helper',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${releaseLarge}';
INSERT INTO prod04c_results SELECT 'release full journey signed read',count(*)=1,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${releaseCardV2}';
INSERT INTO prod04c_results SELECT 'release unpublished anonymous denied',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${releaseDraft}';
INSERT INTO prod04c_results SELECT 'legacy unpublished anonymous denied',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${legacyDraftPath}';
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"${ids.userB}","role":"authenticated"}',true);
INSERT INTO prod04c_results SELECT 'foreign authenticated private read denied',count(*)=0,'visible='||count(*) FROM storage.objects WHERE bucket_id='listing-media' AND name='${releaseDraft}';
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO prod04c_results SELECT 'service_role remains operational',count(*)=1,'visible='||count(*) FROM vehicle.profile_media WHERE id='${ids.releaseApproved}';
RESET ROLE;

UPDATE public.release_compatibility_state SET mode='normal', updated_at=now() WHERE singleton;
SELECT test,passed,detail FROM prod04c_results ORDER BY test;
`;

(async () => {
  await query(cleanupSql);
  try {
    const results = await query(runtimeSql);
    assert.ok(results.length >= 20, `expected PROD-04C runtime matrix, got ${results.length} rows`);
    const failures = results.filter((result) => !result.passed);
    assert.deepEqual(failures, [], `PROD-04C runtime failures: ${JSON.stringify(failures, null, 2)}`);
    console.log(`PROD-04C full-chain media matrix passed (${results.length} checks).`);
    for (const result of results) console.log(`PASS ${result.test}: ${result.detail}`);
  } finally {
    await query(cleanupSql).catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
