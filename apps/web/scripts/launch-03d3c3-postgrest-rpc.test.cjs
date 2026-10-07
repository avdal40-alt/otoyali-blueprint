const assert = require("node:assert/strict");
const { execFileSync, execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(execSync("npx supabase status -o env", { cwd: require("node:path").resolve(__dirname, "../../.."), encoding: "utf8" }).matchAll(/^(\w+)="([^"]*)"$/gm).map(([, k, v]) => [k, v]));
assert.match(env.API_URL || "", /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/, "refusing non-local Supabase URL");
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ids = [randomUUID(), randomUUID(), randomUUID()]; let listingId;
const tag = `LOCAL_POSTGREST_${randomUUID()}`;
const sql = (q) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", q], { encoding: "utf8" }).trim();
async function user(id, suffix) {
  const email = `local-postgrest-${suffix}-${id}@example.test`, password = `Local-${id}-A9!`;
  const { error } = await admin.auth.admin.createUser({ id, email, password, email_confirm: true }); assert.ifError(error);
  const client = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email }); assert.ifError(linkError);
  const tokenHash = link.properties.hashed_token; assert.ok(tokenHash);
  const { data, error: loginError } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }); assert.ifError(loginError); assert.ok(data.session?.access_token);
  return client;
}
(async () => { try {
  const [a, b, c] = await Promise.all([user(ids[0], "a"), user(ids[1], "b"), user(ids[2], "c")]);
  sql(`UPDATE public.profiles SET seller_type='private', city='Ankara' WHERE id='${ids[0]}'; INSERT INTO identity.seller_phone_verifications(user_id, phone_e164) VALUES ('${ids[0]}','+905550000001');`);
  const [makeId, modelId] = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models m JOIN vehicle.makes k ON k.id=m.make_id WHERE k.is_active AND m.is_active LIMIT 1").split("|");
  const payload = { p_make_id: makeId, p_model_id: modelId, p_variant_id: null, p_year: 2021, p_mileage_km: 1, p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic", p_body_type: "sedan", p_drive_type: "front", p_color: "test", p_engine_volume_l: 1.6, p_damage_state: "unknown", p_owner_count: 1, p_description: tag, p_price_amount_text: "1000000", p_currency: "TRY", p_price_negotiable: false, p_city: "Ankara", p_city_id: null, p_district_id: null };
  const legacyCreated = await a.rpc("create_own_listing_draft", { ...payload, p_description: `${tag}_LEGACY` }); assert.ifError(legacyCreated.error);
  const legacyListingId = legacyCreated.data?.[0]?.listing_id; assert.ok(legacyListingId);
  assert.equal(sql(`SELECT seller_id || '|' || status || '|' || moderation_status FROM marketplace.listings WHERE id='${legacyListingId}'`), `${ids[0]}|draft|pending_review`);
  const created = await a.rpc("create_own_private_listing_draft", payload); assert.ifError(created.error); listingId = created.data?.[0]?.listing_id; assert.ok(listingId);
  assert.equal(sql(`SELECT seller_id || '|' || status || '|' || moderation_status || '|' || (published_at IS NULL)::text FROM marketplace.listings WHERE id='${listingId}'`), `${ids[0]}|draft|draft|true`);
  const [listingUpdatedAt, vehicleUpdatedAt, originalDescription] = sql(`SELECT l.updated_at || '|' || v.updated_at || '|' || l.description FROM marketplace.listings l JOIN vehicle.vehicle_profiles v ON v.id=l.vehicle_profile_id WHERE l.id='${listingId}'`).split("|");
  const crossUpdate = await b.rpc("save_own_listing_edit", { p_listing_id: listingId, p_expected_listing_updated_at: listingUpdatedAt, p_expected_vehicle_updated_at: vehicleUpdatedAt, p_make_id: makeId, p_model_id: modelId, p_year: 2021, p_mileage_km: 2, p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic", p_body_type: "sedan", p_drive_type: "front", p_color: "test", p_engine_volume_l: 1.6, p_damage_state: "unknown", p_owner_count: 1, p_description: `${tag}_UNAUTHORIZED`, p_price_amount_text: "1000000", p_currency: "TRY", p_price_negotiable: false, p_city: "Ankara" });
  assert.ok(crossUpdate.error, "USER B draft update must be rejected");
  assert.equal(sql(`SELECT seller_id || '|' || description || '|' || status || '|' || moderation_status FROM marketplace.listings WHERE id='${listingId}'`), `${ids[0]}|${originalDescription}|draft|draft`);
  const anonymous = await anon.rpc("create_own_private_listing_draft", payload); assert.ok(anonymous.error);
  const ineligible = await c.rpc("create_own_private_listing_draft", payload); assert.ok(ineligible.error);
  assert.ok((await b.rpc("submit_own_listing_for_review", { p_listing_id: listingId })).error);
  assert.ok((await anon.rpc("submit_own_listing_for_review", { p_listing_id: listingId })).error, "anon submit must be rejected");
  const submitted = await a.rpc("submit_own_listing_for_review", { p_listing_id: listingId }); assert.ifError(submitted.error);
  assert.deepEqual(submitted.data?.[0], { listing_id: listingId, status: "draft", moderation_status: "pending_review" });
  assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (published_at IS NULL)::text FROM marketplace.listings WHERE id='${listingId}'`), "draft|pending_review|true");
  assert.equal(sql(`SELECT count(*) FROM marketplace.listing_moderation_runs WHERE listing_id='${listingId}'`), "0");
  assert.equal(sql(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${listingId}'`), "0");
  const crossArchive = await b.rpc("archive_own_listing", { p_listing_id: listingId }); assert.ok(crossArchive.error, "USER B draft archive must be rejected"); assert.match(crossArchive.error.message, /listing owner authorization required/i);
  assert.equal(sql(`SELECT seller_id || '|' || status || '|' || moderation_status || '|' || (archived_at IS NULL)::text || '|' || (published_at IS NULL)::text FROM marketplace.listings WHERE id='${listingId}'`), `${ids[0]}|draft|pending_review|true|true`);
  const anonymousArchive = await anon.rpc("archive_own_listing", { p_listing_id: listingId }); assert.ok(anonymousArchive.error, "anon archive must be rejected");
  const archived = await a.rpc("archive_own_listing", { p_listing_id: listingId }); assert.ifError(archived.error);
  assert.equal(archived.data?.[0]?.status, "removed"); assert.equal(archived.data?.[0]?.moderation_status, "archived");
  assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (archived_at IS NOT NULL)::text || '|' || (published_at IS NULL)::text FROM marketplace.listings WHERE id='${listingId}'`), "removed|archived|true|true");
  assert.equal(sql(`SELECT count(*) FROM public.admin_audit_logs WHERE actor_user_id='${ids[0]}' AND action='listing.archive' AND entity_id='${listingId}'`), "1");
  assert.equal(sql(`SELECT count(*) FROM marketplace.listing_moderation_runs WHERE listing_id='${listingId}'`), "0");
  console.log("LAUNCH-03D3C3 PostgREST RPC privilege: PASS");
} finally {
  sql(`DELETE FROM marketplace.listings WHERE seller_id IN ('${ids.join("','")}'); DELETE FROM vehicle.profile_ownership WHERE owner_id IN ('${ids.join("','")}'); DELETE FROM vehicle.vehicle_profiles WHERE created_by IN ('${ids.join("','")}'); DELETE FROM identity.seller_phone_verifications WHERE user_id IN ('${ids.join("','")}'); DELETE FROM public.profiles WHERE id IN ('${ids.join("','")}'); DELETE FROM auth.users WHERE id IN ('${ids.join("','")}');`);
} })().catch((error) => { console.error(error); process.exitCode = 1; });
