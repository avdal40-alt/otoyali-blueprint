const assert = require("node:assert/strict");
const { execFileSync, execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const output = execSync("npx supabase status -o env", { cwd: require("node:path").resolve(__dirname, "../../.."), encoding: "utf8" });
const env = Object.fromEntries([...output.matchAll(/^(\w+)="([^"]*)"$/gm)].map(([, key, value]) => [key, value]));
const apiUrl = "http://127.0.0.1:55421";
const service = createClient(apiUrl, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(apiUrl, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ids = Object.fromEntries(["owner", "other", "legacy", "nonTurkish"].map((name) => [name, randomUUID()]));
const sql = (statement) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement], { encoding: "utf8" }).trim();
const count = (statement) => Number(sql(statement));
const phones = { owner: "+905550001001", other: "+905550001002", legacy: "+905550001003", nonTurkish: "+14155550104" };
let createdListingIds = [];

async function session(id, phone, name) {
  const password = `Local-${id}-A9!`;
  const email = `b01a-${name}-${id}@example.test`;
  const { error: createError } = await service.auth.admin.createUser({ id, email, phone, password, email_confirm: true, phone_confirm: true });
  assert.ifError(createError);
  const { data: updated, error: updateError } = await service.auth.admin.updateUserById(id, { phone, phone_confirm: true });
  assert.ifError(updateError);
  assert.equal(updated.user?.phone?.replace(/^\+/, ""), phone.replace(/^\+/, ""), "fixture must retain confirmed account phone");
  const client = createClient(apiUrl, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  assert.ifError(linkError);
  const { data, error } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  assert.ifError(error);
  assert.ok(data.session?.access_token);
  return client;
}

async function rpcOk(client, name, args) {
  const result = await client.rpc(name, args);
  assert.ifError(result.error);
  return result.data;
}

(async () => {
  try {
    const [owner, other, legacy, nonTurkish] = await Promise.all([
      session(ids.owner, phones.owner, "owner"), session(ids.other, phones.other, "other"),
      session(ids.legacy, phones.legacy, "legacy"), session(ids.nonTurkish, phones.nonTurkish, "non-turkish")
    ]);

    assert.ok((await anon.rpc("get_own_password_enrollment_status")).error, "anon enrollment status must be rejected");
    assert.deepEqual((await rpcOk(owner, "get_own_password_enrollment_status", {}))[0], { password_enrolled: false, password_enrolled_at: null });
    assert.ok((await owner.schema("identity").from("auth_password_enrollments").insert({ user_id: ids.owner, password_enrolled_at: new Date().toISOString(), enrollment_method: "registration" })).error, "browser must not write enrollment state");

    const synced = (await rpcOk(owner, "sync_own_verified_account_phone", {}))[0];
    assert.equal(synced.outcome, "synced");
    assert.match(synced.contact_id, /^[0-9a-f-]{36}$/i);
    const repeated = (await rpcOk(owner, "sync_own_verified_account_phone", {}))[0];
    assert.deepEqual(repeated, synced, "account-phone sync must be idempotent");
    assert.deepEqual((await rpcOk(nonTurkish, "sync_own_verified_account_phone", {}))[0], { outcome: "phone_not_turkish", contact_id: null });

    sql(`INSERT INTO identity.seller_phone_verifications(user_id, phone_e164) VALUES ('${ids.legacy}','${phones.legacy}');
      INSERT INTO identity.verified_seller_contact_phones(user_id, phone_e164, verified_at, verification_source)
      SELECT user_id, phone_e164, verified_at, 'seller_otp' FROM identity.seller_phone_verifications WHERE user_id='${ids.legacy}'
      ON CONFLICT (phone_e164) WHERE is_active DO NOTHING;`);
    assert.equal(count(`SELECT count(*) FROM identity.verified_seller_contact_phones WHERE user_id='${ids.legacy}' AND phone_e164='${phones.legacy}' AND verification_source='seller_otp'`), 1, "legacy verification must migrate to contact");

    sql(`SELECT identity.upsert_verified_seller_contact_phone('${ids.owner}', '+905550001011', 'seller_otp', FALSE);
      SELECT identity.upsert_verified_seller_contact_phone('${ids.owner}', '+905550001012', 'seller_otp', FALSE);`);
    const ownerContacts = await rpcOk(owner, "list_own_verified_seller_contact_phones", {});
    assert.equal(ownerContacts.length, 3);
    assert.ok(ownerContacts.every((row) => /^\+90 \*\*\* \*\*\* \d{4}$/.test(row.masked_phone)));
    assert.deepEqual(await rpcOk(other, "list_own_verified_seller_contact_phones", {}), [], "cross-user contacts must be invisible");
    assert.throws(() => sql(`SELECT identity.upsert_verified_seller_contact_phone('${ids.owner}', '+905550001013', 'seller_otp', FALSE);`), /active seller contact limit reached/);
    assert.throws(() => sql(`SELECT identity.upsert_verified_seller_contact_phone('${ids.other}', '${phones.owner}', 'seller_otp', FALSE);`), /belongs to another user/);

    const [makeId, modelId] = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models m JOIN vehicle.makes mk ON mk.id=m.make_id WHERE mk.is_active AND m.is_active ORDER BY m.id LIMIT 1").split("|");
    const payload = { p_make_id: makeId, p_model_id: modelId, p_variant_id: null, p_year: 2021, p_mileage_km: 1, p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic", p_body_type: "sedan", p_drive_type: "front", p_color: "test", p_engine_volume_l: 1.6, p_damage_state: "unknown", p_owner_count: 1, p_description: `B01A_${randomUUID()}`, p_price_amount_text: "1000000", p_currency: "TRY", p_price_negotiable: false, p_city: "Ankara", p_city_id: null, p_district_id: null };
    const created = await owner.rpc("create_own_listing_draft_v2", { ...payload, p_seller_contact_phone_id: synced.contact_id });
    assert.ifError(created.error);
    const selectedListing = created.data?.[0]?.listing_id;
    assert.match(selectedListing || "", /^[0-9a-f-]{36}$/i);
    createdListingIds.push(selectedListing);
    assert.equal(sql(`SELECT seller_contact_phone_id FROM marketplace.listings WHERE id='${selectedListing}'`), synced.contact_id);
    const crossDraft = await other.rpc("create_own_listing_draft_v2", { ...payload, p_seller_contact_phone_id: synced.contact_id });
    assert.ok(crossDraft.error, "V2 must reject another seller's contact");
    sql(`UPDATE marketplace.listings SET status='active', moderation_status='active', published_at=NOW() WHERE id='${selectedListing}';`);
    const buyerContact = await rpcOk(other, "get_listing_seller_contact", { p_listing_id: selectedListing });
    assert.equal(buyerContact?.[0]?.phone, phones.owner, "selected listing contact must be returned");
    assert.deepEqual(await rpcOk(owner, "get_listing_seller_contact", { p_listing_id: selectedListing }), [], "seller self-contact must remain blocked");
    assert.ok((await anon.rpc("get_listing_seller_contact", { p_listing_id: selectedListing })).error, "anon contact must remain blocked");

    const legacyDraft = await owner.rpc("create_own_private_listing_draft", payload);
    assert.ifError(legacyDraft.error);
    const legacyListing = legacyDraft.data?.[0]?.listing_id;
    createdListingIds.push(legacyListing);
    assert.equal(sql(`SELECT seller_contact_phone_id IS NULL FROM marketplace.listings WHERE id='${legacyListing}'`), "t");
    sql(`UPDATE marketplace.listings SET status='active', moderation_status='active', published_at=NOW() WHERE id='${legacyListing}';
      INSERT INTO identity.seller_phone_verifications(user_id, phone_e164) VALUES ('${ids.owner}','${phones.owner}') ON CONFLICT (user_id) DO UPDATE SET phone_e164=EXCLUDED.phone_e164;`);
    assert.equal((await rpcOk(other, "get_listing_seller_contact", { p_listing_id: legacyListing }))?.[0]?.phone, phones.owner, "legacy listing fallback must remain available");
    console.log("B01A local Auth/JWT/PostgREST foundation: PASS");
  } finally {
    if (createdListingIds.length) sql(`DELETE FROM marketplace.listings WHERE id IN ('${createdListingIds.join("','")}');`);
    const users = Object.values(ids).map((id) => `'${id}'`).join(",");
    sql(`DELETE FROM identity.auth_password_enrollments WHERE user_id IN (${users});
      DELETE FROM identity.verified_seller_contact_phones WHERE user_id IN (${users});
      DELETE FROM identity.seller_phone_verifications WHERE user_id IN (${users});
      DELETE FROM vehicle.profile_ownership WHERE owner_id IN (${users});
      DELETE FROM vehicle.vehicle_profiles WHERE created_by IN (${users});
      DELETE FROM public.profiles WHERE id IN (${users});
      DELETE FROM auth.users WHERE id IN (${users});`);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
