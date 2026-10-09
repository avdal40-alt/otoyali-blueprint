const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const apiUrl = process.env.LOCAL_SUPABASE_API_URL;
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.LOCAL_TEST_EMAIL;
const phone = process.env.LOCAL_TEST_PHONE;
const action = process.argv.find((value) => value.startsWith("--prepare="))?.slice("--prepare=".length);
const allowedActions = new Set(["one", "multi", "zero", "edit-explicit", "edit-legacy", "edit-zero", "all"]);

function requireLocalUrl(value, label) {
  assert.ok(value, `${label} is required`);
  const parsed = new URL(value);
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname), `${label} must be local`);
  return parsed;
}

const localApi = requireLocalUrl(apiUrl, "LOCAL_SUPABASE_API_URL");
assert.ok(serviceRoleKey, "LOCAL_SUPABASE_SERVICE_ROLE_KEY is required");
assert.match(email || "", /^local-[a-z0-9-]+@example\.test$/i, "LOCAL_TEST_EMAIL must be synthetic");
assert.match(phone || "", /^\+90\d{10}$/, "LOCAL_TEST_PHONE must be a synthetic Turkish number");
assert.ok(action || process.argv.includes("--cleanup"), "--prepare is required");
assert.ok(!action || allowedActions.has(action), "unsupported visual fixture state");

const service = createClient(localApi.toString(), serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

function databaseContainer() {
  const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const name = names.find((value) => value.startsWith("supabase_db_"));
  assert.ok(name, "local Supabase database container is required");
  return name;
}

function sql(statement) {
  return execFileSync("docker", ["exec", databaseContainer(), "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement], { encoding: "utf8" }).trim();
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function fixtureUser() {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(error);
  const user = data.users.find((candidate) => candidate.email === email);
  assert.ok(user, "run local-auth-browser-bootstrap before preparing visual fixtures");
  return user;
}

async function authenticatedFixtureClient() {
  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  assert.ifError(linkError);
  assert.ok(link.properties.hashed_token, "local Auth must provide a verification token");
  const client = createClient(localApi.toString(), process.env.LOCAL_SUPABASE_ANON_KEY || "", { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  assert.ifError(error);
  return client;
}

function completeProfile(userId) {
  sql(`UPDATE auth.users SET phone=${quote(phone)}, phone_confirmed_at=now() WHERE id=${quote(userId)};
       UPDATE public.profiles SET first_name='Local', last_name='Visual', full_name='Local Visual', display_name='Local Visual', seller_type='private', city='Ankara', onboarding_completed_at=now() WHERE id=${quote(userId)};`);
}

function removeFixtureListings(userId) {
  sql(`DELETE FROM marketplace.listings WHERE seller_id=${quote(userId)} AND description LIKE 'LOCAL_VISUAL_QA_%';`);
}

function setZeroContacts(userId, removeListings = true) {
  if (removeListings) removeFixtureListings(userId);
  sql(`UPDATE auth.users SET phone=NULL, phone_confirmed_at=NULL WHERE id=${quote(userId)};
       DELETE FROM identity.verified_seller_contact_phones WHERE user_id=${quote(userId)};`);
}

function setOneContact(userId) {
  completeProfile(userId);
  sql(`DELETE FROM identity.verified_seller_contact_phones WHERE user_id=${quote(userId)} AND verification_source <> 'auth_account_phone';`);
}

function addExtraContacts(userId) {
  sql(`SELECT identity.upsert_verified_seller_contact_phone(${quote(userId)}::uuid, '+905550008811', 'seller_otp', FALSE);
       SELECT identity.upsert_verified_seller_contact_phone(${quote(userId)}::uuid, '+905550008812', 'seller_otp', FALSE);`);
}

async function contacts(client) {
  const synced = await client.rpc("sync_own_verified_account_phone");
  assert.ifError(synced.error);
  const listed = await client.rpc("list_own_verified_seller_contact_phones");
  assert.ifError(listed.error);
  assert.ok(Array.isArray(listed.data));
  return listed.data;
}

function catalog() {
  const [makeId, modelId] = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models m JOIN vehicle.makes mk ON mk.id=m.make_id WHERE mk.is_active AND m.is_active ORDER BY m.id LIMIT 1").split("|");
  assert.ok(makeId && modelId, "local vehicle catalog fixture is required");
  return { makeId, modelId };
}

async function createDraft(client, contactId, kind) {
  const { makeId, modelId } = catalog();
  const payload = {
    p_make_id: makeId, p_model_id: modelId, p_variant_id: null, p_year: 2021,
    p_mileage_km: 1000, p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic",
    p_body_type: "sedan", p_drive_type: "front", p_color: "Local Visual", p_engine_volume_l: 1.6,
    p_damage_state: "unknown", p_owner_count: 1, p_description: `LOCAL_VISUAL_QA_${kind}_${randomUUID()}`,
    p_price_amount_text: "1000000", p_currency: "TRY", p_price_negotiable: false, p_city: "Ankara",
    p_city_id: null, p_district_id: null
  };
  const result = contactId
    ? await client.rpc("create_own_listing_draft_v2", { ...payload, p_seller_contact_phone_id: contactId })
    : await client.rpc("create_own_private_listing_draft", payload);
  assert.ifError(result.error);
  const listingId = result.data?.[0]?.listing_id;
  assert.match(listingId || "", /^[0-9a-f-]{36}$/i, "fixture listing must be created through the real draft RPC");
  return listingId;
}

async function prepare() {
  const user = await fixtureUser();
  const client = await authenticatedFixtureClient();
  if (action === "zero") {
    setZeroContacts(user.id);
    console.log("LOCAL_VISUAL_QA_FIXTURE=zero-contact-gate");
    return;
  }

  setOneContact(user.id);
  let listed = await contacts(client);
  assert.equal(listed.length, 1, "one-contact fixture must contain exactly one contact");
  if (action === "one") {
    console.log("LOCAL_VISUAL_QA_FIXTURE=one-contact-selector");
    return;
  }

  addExtraContacts(user.id);
  listed = await contacts(client);
  assert.equal(listed.length, 3, "multi-contact fixture must contain exactly three contacts");
  if (action === "multi") {
    console.log("LOCAL_VISUAL_QA_FIXTURE=multi-contact-selector");
    return;
  }

  removeFixtureListings(user.id);
  const explicitListingId = await createDraft(client, listed[0].contact_id, "explicit");
  const legacyListingId = await createDraft(client, null, "legacy");
  if (action === "edit-zero") {
    setZeroContacts(user.id, false);
    console.log(`LOCAL_VISUAL_QA_EDIT_PATH=/sell?edit=${legacyListingId}`);
    console.log("LOCAL_VISUAL_QA_FIXTURE=edit-zero-contact");
    return;
  }
  console.log(`LOCAL_VISUAL_QA_EDIT_PATH=/sell?edit=${action === "edit-legacy" ? legacyListingId : explicitListingId}`);
  console.log(`LOCAL_VISUAL_QA_EXPLICIT_EDIT_PATH=/sell?edit=${explicitListingId}`);
  console.log(`LOCAL_VISUAL_QA_LEGACY_EDIT_PATH=/sell?edit=${legacyListingId}`);
  console.log(`LOCAL_VISUAL_QA_FIXTURE=${action === "edit-legacy" ? "edit-legacy-null" : "edit-explicit-multi"}`);
}

async function cleanup() {
  const user = await fixtureUser();
  removeFixtureListings(user.id);
  sql(`DELETE FROM vehicle.profile_ownership WHERE owner_id=${quote(user.id)};
       DELETE FROM vehicle.vehicle_profiles WHERE created_by=${quote(user.id)};
       DELETE FROM identity.seller_phone_verifications WHERE user_id=${quote(user.id)};
       DELETE FROM identity.verified_seller_contact_phones WHERE user_id=${quote(user.id)};`);
  console.log("LOCAL_VISUAL_QA_FIXTURE_CLEANUP=PASS");
}

(process.argv.includes("--cleanup") ? cleanup() : prepare()).catch((error) => { console.error(error.message); process.exitCode = 1; });
