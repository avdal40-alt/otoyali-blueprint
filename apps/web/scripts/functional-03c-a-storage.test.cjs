const assert = require("node:assert/strict");
const { createHmac, randomUUID } = require("node:crypto");
const { execFileSync } = require("node:child_process");

const apiUrl = "http://127.0.0.1:54321";
const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const sql = (statement) => execFileSync("docker", [...db, statement], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["listing", "otherListing", "unverifiedListing", "vehicle", "otherVehicle", "unverifiedVehicle", "make", "model"].map((key) => [key, randomUUID()]));
const prefix = `functional-03c-a-storage-${ids.listing}`;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const base64url = (value) => Buffer.from(value).toString("base64url");
const secret = execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", "supabase_auth_Otoyali-blueprint"], { encoding: "utf8" }).split(/\r?\n/).find((line) => line.startsWith("GOTRUE_JWT_SECRET="))?.slice(18);
assert.ok(secret, "local Supabase JWT secret unavailable");
function jwt(role, claims = {}) {
  const now = Math.floor(Date.now() / 1000);
  const input = `${base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${base64url(JSON.stringify({ role, iss: "supabase-demo", iat: now, exp: now + 300, ...claims }))}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}
const anon = jwt("anon");
const user = (label) => { const id = randomUUID(); return { id, email: `${prefix}-${label}@test.invalid`, token: jwt("authenticated", { sub: id }) }; };
const headers = (token, contentType) => ({ apikey: anon, Authorization: `Bearer ${token}`, ...(contentType ? { "Content-Type": contentType } : {}) });
const pathFor = (owner, listing, filename) => `${owner}/prod04a-2026082801/${listing}/${filename}`;
const urlFor = (storagePath) => `${apiUrl}/storage/v1/object/listing-videos/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
const upload = (actor, storagePath, contentType = "video/mp4", upsert = false) => fetch(urlFor(storagePath), { method: "POST", headers: { ...headers(actor?.token ?? anon, contentType), "x-upsert": String(upsert) }, body: Buffer.from("03c-a-storage") });
const read = (token, storagePath) => fetch(urlFor(storagePath), { headers: headers(token) });
const remove = (actor, storagePath) => fetch(urlFor(storagePath), { method: "DELETE", headers: headers(actor.token) });
const rpc = (actor, name, body) => fetch(`${apiUrl}/rest/v1/rpc/${name}`, { method: "POST", headers: headers(actor.token, "application/json"), body: JSON.stringify(body) });

function provision(users) {
  sql(`
    INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
      ('00000000-0000-0000-0000-000000000000',${quote(users.verified.id)},'authenticated','authenticated',${quote(users.verified.email)},'{}','{}',now(),now()),
      ('00000000-0000-0000-0000-000000000000',${quote(users.individual.id)},'authenticated','authenticated',${quote(users.individual.email)},'{}','{}',now(),now()),
      ('00000000-0000-0000-0000-000000000000',${quote(users.unverified.id)},'authenticated','authenticated',${quote(users.unverified.email)},'{}','{}',now(),now()),
      ('00000000-0000-0000-0000-000000000000',${quote(users.other.id)},'authenticated','authenticated',${quote(users.other.email)},'{}','{}',now(),now());
    UPDATE public.profiles SET seller_type='dealer' WHERE id IN (${quote(users.verified.id)},${quote(users.unverified.id)},${quote(users.other.id)});
    INSERT INTO marketplace.galeri_verifications(dealer_id,status,reviewed_at,reviewed_by) VALUES (${quote(users.verified.id)},'verified',now(),${quote(users.verified.id)}),(${quote(users.unverified.id)},'pending',NULL,NULL),(${quote(users.other.id)},'verified',now(),${quote(users.other.id)});
    INSERT INTO vehicle.makes(id,name,slug) VALUES (${quote(ids.make)},'03C Storage Make',${quote(`${prefix}-make`)});
    INSERT INTO vehicle.models(id,make_id,name,slug) VALUES (${quote(ids.model)},${quote(ids.make)},'03C Storage Model',${quote(`${prefix}-model`)});
    INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES (${quote(ids.vehicle)},${quote(ids.make)},${quote(ids.model)},2024,100,'gasoline','automatic','manual','active',${quote(users.verified.id)}),(${quote(ids.otherVehicle)},${quote(ids.make)},${quote(ids.model)},2024,100,'gasoline','automatic','manual','active',${quote(users.other.id)}),(${quote(ids.unverifiedVehicle)},${quote(ids.make)},${quote(ids.model)},2024,100,'gasoline','automatic','manual','active',${quote(users.unverified.id)});
    INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES (${quote(ids.vehicle)},${quote(users.verified.id)},'owner',true),(${quote(ids.otherVehicle)},${quote(users.other.id)},'owner',true),(${quote(ids.unverifiedVehicle)},${quote(users.unverified.id)},'owner',true);
    INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES (${quote(ids.listing)},${quote(ids.vehicle)},${quote(users.verified.id)},'active','active','03C storage verified',100000,'TRY',false,'Istanbul','dealer'),(${quote(ids.otherListing)},${quote(ids.otherVehicle)},${quote(users.other.id)},'active','active','03C storage other',100000,'TRY',false,'Istanbul','dealer'),(${quote(ids.unverifiedListing)},${quote(ids.unverifiedVehicle)},${quote(users.unverified.id)},'active','active','03C storage unverified',100000,'TRY',false,'Istanbul','dealer');
  `);
}
function cleanup(users) {
  const usersSql = Object.values(users).map(({ id }) => quote(id)).join(",");
  sql(`DELETE FROM marketplace.listing_videos WHERE listing_id IN (${quote(ids.listing)},${quote(ids.otherListing)},${quote(ids.unverifiedListing)}); DELETE FROM marketplace.listings WHERE id IN (${quote(ids.listing)},${quote(ids.otherListing)},${quote(ids.unverifiedListing)}); DELETE FROM marketplace.galeri_verifications WHERE dealer_id IN (${usersSql}); DELETE FROM vehicle.profile_ownership WHERE vehicle_profile_id IN (${quote(ids.vehicle)},${quote(ids.otherVehicle)},${quote(ids.unverifiedVehicle)}); DELETE FROM vehicle.vehicle_profiles WHERE id IN (${quote(ids.vehicle)},${quote(ids.otherVehicle)},${quote(ids.unverifiedVehicle)}); DELETE FROM vehicle.models WHERE id=${quote(ids.model)}; DELETE FROM vehicle.makes WHERE id=${quote(ids.make)}; DELETE FROM auth.users WHERE id IN (${usersSql});`);
}

(async () => {
  const users = { verified: user("verified"), individual: user("individual"), unverified: user("unverified"), other: user("other") };
  const own = pathFor(users.verified.id, ids.listing, `${prefix}.mp4`);
  const unreferenced = pathFor(users.verified.id, ids.listing, `${prefix}-unreferenced.mp4`);
  const created = [];
  const expect = async (name, promise, wanted) => assert.equal((await promise).ok, wanted, name);
  try {
    provision(users);
    assert.equal(sql("SELECT has_function_privilege('anon','marketplace.can_manage_own_listing_video_storage_path(text)','EXECUTE')"), "f", "anon must not receive owner-management authority");
    assert.equal(sql("SELECT has_function_privilege('anon','marketplace.can_read_public_listing_video_storage_path(text)','EXECUTE')"), "t", "anon must only receive the public-read predicate");
    await expect("anon upload denied", upload(null, own), false);
    await expect("individual upload denied", upload(users.individual, pathFor(users.individual.id, ids.listing, `${prefix}-individual.mp4`)), false);
    await expect("unverified Galeri upload denied", upload(users.unverified, pathFor(users.unverified.id, ids.unverifiedListing, `${prefix}-unverified.mp4`)), false);
    await expect("cross-owner upload denied", upload(users.verified, pathFor(users.verified.id, ids.otherListing, `${prefix}-cross.mp4`)), false);
    await expect("malformed path denied", upload(users.verified, `${users.verified.id}/${ids.listing}/${prefix}-malformed.mp4`), false);
    await expect("invalid MIME denied", upload(users.verified, pathFor(users.verified.id, ids.listing, `${prefix}-invalid.mp4`), "image/png"), false);
    await expect("verified canonical upload allowed", upload(users.verified, own), true); created.push(own);
    await expect("unreferenced canonical object anonymous read denied", read(anon, own), false);
    await expect("owner replacement write allowed", upload(users.verified, own, "video/mp4", true), true);
    let response = await rpc(users.verified, "attach_own_listing_video", { p_listing_id: ids.listing, p_storage_path: own, p_title: "03C storage", p_description: null, p_duration_seconds: 1 });
    assert.equal(response.ok, true, `owner attach RPC failed (${response.status})`);
    await expect("pending video anonymous read denied", read(anon, own), false);
    sql(`UPDATE marketplace.listing_videos SET status='active',visibility='public',moderation_status='approved' WHERE listing_id=${quote(ids.listing)}`);
    await expect("approved public current anonymous read allowed", read(anon, own), true);
    await expect("unreferenced path anonymous read denied", upload(users.verified, unreferenced), true); created.push(unreferenced);
    await expect("unreferenced object anonymous read denied", read(anon, unreferenced), false);
    sql(`UPDATE marketplace.listing_videos SET moderation_status='rejected' WHERE listing_id=${quote(ids.listing)}`);
    await expect("rejected video anonymous read denied", read(anon, own), false);
    sql(`UPDATE marketplace.listing_videos SET moderation_status='approved',visibility='private' WHERE listing_id=${quote(ids.listing)}`);
    await expect("non-public video anonymous read denied", read(anon, own), false);
    sql(`UPDATE marketplace.listing_videos SET visibility='public' WHERE listing_id=${quote(ids.listing)}; UPDATE marketplace.listings SET archived_at=now() WHERE id=${quote(ids.listing)}`);
    await expect("ineligible listing anonymous read denied", read(anon, own), false);
    sql(`UPDATE marketplace.listings SET archived_at=NULL WHERE id=${quote(ids.listing)}; UPDATE marketplace.galeri_verifications SET status='rejected' WHERE dealer_id=${quote(users.verified.id)}`);
    await expect("verification-revoked anonymous read denied", read(anon, own), false);
    sql(`UPDATE marketplace.galeri_verifications SET status='verified',reviewed_at=now(),reviewed_by=${quote(users.verified.id)} WHERE dealer_id=${quote(users.verified.id)}`);
    await expect("other owner delete denied", remove(users.other, own), false);
    await expect("owner delete allowed", remove(users.verified, own), true); created.splice(created.indexOf(own), 1);
    assert.equal(sql("SELECT file_size_limit FROM storage.buckets WHERE id='listing-videos'"), "104857600", "100 MiB limit changed");
    console.log("FUNCTIONAL-03C-A Storage public-read/runtime matrix passed (19 checks plus helper grants)");
  } finally {
    for (const storagePath of created) await remove(users.verified, storagePath);
    cleanup(users);
  }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
