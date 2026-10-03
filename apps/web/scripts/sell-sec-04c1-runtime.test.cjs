const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createLocalAuthenticatedHttpFixture, createLocalClient } = require("./helpers/local-auth-http-fixture.cjs");
const { createVerifiedGaleriFixture } = require("./helpers/verified-galeri-fixture.cjs");
const { fetchWithTimeout, startOwnedNextServer, stopOwnedNextServer } = require("./helpers/next-http-test-server.cjs");

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const rows = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
const makeId = randomUUID();
const modelId = randomUUID();
const payload = { p_make_id: makeId, p_model_id: modelId, p_variant_id: null, p_year: 2024, p_mileage_km: 100, p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic", p_body_type: null, p_drive_type: null, p_color: null, p_engine_volume_l: 1.6, p_damage_state: "unknown", p_owner_count: null, p_description: "C1 runtime fixture", p_price_amount_text: "100000", p_currency: "TRY", p_price_negotiable: false, p_city: "C1 Test City", p_city_id: null, p_district_id: null };
const httpPayload = { makeId, modelId, variantId: null, year: 2024, mileageKm: 100, condition: "used", fuelType: "gasoline", transmission: "automatic", bodyType: null, driveType: null, color: null, engineVolumeL: 1.6, damageState: "unknown", ownerCount: null, description: "C1 runtime fixture", priceAmount: "100000", currency: "TRY", priceNegotiable: false, city: "C1 Test City", cityId: null, districtId: null };

async function verifySellerPhone(userId, phone) {
  const service = createLocalClient("service_role").client;
  const reserved = await service.rpc("reserve_seller_phone_verification_challenge_service", { p_user_id: userId, p_phone_e164: phone });
  assert.ifError(reserved.error);
  const challenge = Array.isArray(reserved.data) ? reserved.data[0] : reserved.data;
  assert.equal(challenge.outcome, "reserved");
  const marked = await service.rpc("mark_seller_phone_verification_challenge_sent_service", { p_challenge_id: challenge.challenge_id, p_provider_reference: `C1-${userId}` });
  assert.ifError(marked.error);
  const finalized = await service.rpc("finalize_seller_phone_verification_service", { p_user_id: userId, p_challenge_id: challenge.challenge_id });
  assert.ifError(finalized.error);
}

async function sellerEligibility(client) {
  const result = await client.rpc("is_turkey_seller_phone_verified");
  assert.ifError(result.error);
  return result.data;
}

async function draft(client) { return client.rpc("create_own_listing_draft", payload); }

function stateFor(userId) {
  return rows(`
    SELECT 'vehicle_profiles|' || count(*) FROM vehicle.vehicle_profiles WHERE created_by = '${userId}'
    UNION ALL SELECT 'ownership|' || count(*) FROM vehicle.profile_ownership WHERE owner_id = '${userId}'
    UNION ALL SELECT 'listings|' || count(*) FROM marketplace.listings WHERE seller_id = '${userId}'
    UNION ALL SELECT 'media|' || count(*) FROM vehicle.profile_media WHERE vehicle_profile_id IN (SELECT id FROM vehicle.vehicle_profiles WHERE created_by = '${userId}')
    UNION ALL SELECT 'creation_audit|' || count(*) FROM identity.audit_logs WHERE resource_id IN (SELECT id FROM vehicle.vehicle_profiles WHERE created_by = '${userId}');
  `).sort();
}

function assertNoPartialState(userId, before) { assert.deepEqual(stateFor(userId), before, `denied create left persistent state for ${userId}`); }

function row(result) {
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  assert.ok(value?.listing_id && value?.vehicle_profile_id && value?.created_at, "draft return contract changed");
  return value;
}

async function api(origin, fixture) {
  const response = await fetchWithTimeout(`${origin}/api/listings`, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${fixture.accessToken}` }, body: JSON.stringify(httpPayload) });
  return { response, body: await response.json() };
}

(async () => {
  const individualA = await createLocalAuthenticatedHttpFixture({ label: "unverified" });
  const individualB = await createLocalAuthenticatedHttpFixture({ label: "auth-tr", phone: "+905551111111" });
  const individualC = await createLocalAuthenticatedHttpFixture({ label: "foreign-auth", phone: "+77011234567" });
  const individualD = await createLocalAuthenticatedHttpFixture({ label: "verified" });
  const galeriE = await createVerifiedGaleriFixture();
  const galeriF = await createVerifiedGaleriFixture();
  const fixtures = [individualA, individualB, individualC, individualD, galeriE, galeriF];
  let server;
  try {
    rows(`INSERT INTO vehicle.makes (id, name, slug, is_active) VALUES ('${makeId}', 'C1 Runtime Make', 'c1-runtime-${makeId.slice(0, 8)}', true); INSERT INTO vehicle.models (id, make_id, name, slug, is_active) VALUES ('${modelId}', '${makeId}', 'C1 Runtime Model', 'c1-runtime-${modelId.slice(0, 8)}', true);`);
    await verifySellerPhone(individualC.userId, "+905551222222");
    await verifySellerPhone(individualD.userId, "+905551333333");
    await verifySellerPhone(galeriF.ids.dealer, "+905551444444");

    const anon = createLocalClient("anon").client;
    const unauthenticated = await draft(anon);
    assert.ok(unauthenticated.error && unauthenticated.error.code !== "OT403", "anon RPC must retain unauthenticated denial, not C1 classification");

    const denied = [individualA, individualB, { userId: galeriE.ids.dealer, client: galeriE.verified }];
    for (const fixture of denied) {
      const before = stateFor(fixture.userId);
      const result = await draft(fixture.client);
      assert.equal(result.error?.code, "OT403");
      assert.equal(result.error?.message, "seller phone verification required");
      assert.ok(Object.hasOwn(result.error, "details") && Object.hasOwn(result.error, "hint"), "PostgREST C1 error must retain safe details and hint fields for exact mapper review");
      assertNoPartialState(fixture.userId, before);
    }

    assert.equal(await sellerEligibility(individualB.client), false, "Auth +90 alone must not establish seller verification");
    assert.equal(await sellerEligibility(individualC.client), true);
    assert.equal(await sellerEligibility(individualD.client), true);
    assert.equal(await sellerEligibility(galeriE.verified), false);
    assert.equal(await sellerEligibility(galeriF.verified), true);
    assert.equal((await individualA.client.rpc("is_verified_galeri", { p_dealer_id: individualD.userId })).data, false, "seller verification alone must not grant Galeri authority");
    assert.equal((await galeriE.verified.rpc("is_verified_galeri", { p_dealer_id: galeriE.ids.dealer })).data, true);
    assert.equal((await galeriF.verified.rpc("is_verified_galeri", { p_dealer_id: galeriF.ids.dealer })).data, true);

    for (const fixture of [individualC, individualD, { userId: galeriF.ids.dealer, client: galeriF.verified }]) {
      const result = await draft(fixture.client); assert.ifError(result.error); row(result);
    }
    assert.equal(rows(`SELECT phone FROM auth.users WHERE id = '${individualC.userId}'`)[0], "+77011234567", "seller verification must not alter foreign Auth phone");

    const root = path.resolve(__dirname, "..", "..", "..");
    const edit = fs.readFileSync(path.join(root, "apps/web/src/app/api/listings/[id]/route.ts"), "utf8");
    const resubmit = fs.readFileSync(path.join(root, "apps/web/src/app/api/listings/[id]/resubmit/route.ts"), "utf8");
    assert.doesNotMatch(edit + resubmit, /create_own_listing_draft/);

    server = await startOwnedNextServer({ NEXT_PUBLIC_SUPABASE_URL: individualA.localSupabase.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: individualA.localSupabase.anonKey, SUPABASE_SERVICE_ROLE_KEY: "" });
    for (const fixture of [individualA, individualB, { accessToken: galeriE.accessToken, userId: galeriE.ids.dealer }]) {
      const before = stateFor(fixture.userId); const result = await api(server.origin, fixture);
      assert.equal(result.response.status, 403); assert.deepEqual(result.body, { error: "SELLER_PHONE_VERIFICATION_REQUIRED" }); assertNoPartialState(fixture.userId, before);
    }
    for (const fixture of [individualD, { accessToken: galeriF.accessToken, userId: galeriF.ids.dealer }]) {
      const result = await api(server.origin, fixture);
      assert.equal(result.response.status, 201); assert.ok(result.body.data?.listingId && result.body.data?.vehicleProfileId && result.body.data?.createdAt);
    }
    console.log("PASS SELL-SEC-04C1-R1 direct RPC, API, Galeri, and no-partial-state runtime matrix");
  } finally {
    try { if (server) await stopOwnedNextServer(server); }
    finally {
      const userIds = [individualA.userId, individualB.userId, individualC.userId, individualD.userId, galeriE.ids.dealer, galeriF.ids.dealer];
      rows(`DELETE FROM marketplace.listings WHERE seller_id IN (${userIds.map((id) => `'${id}'`).join(",")}); DELETE FROM vehicle.profile_ownership WHERE owner_id IN (${userIds.map((id) => `'${id}'`).join(",")}); DELETE FROM vehicle.vehicle_profiles WHERE created_by IN (${userIds.map((id) => `'${id}'`).join(",")}); DELETE FROM vehicle.models WHERE id = '${modelId}'; DELETE FROM vehicle.makes WHERE id = '${makeId}';`);
      for (const fixture of fixtures.reverse()) fixture.cleanup();
    }
  }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
