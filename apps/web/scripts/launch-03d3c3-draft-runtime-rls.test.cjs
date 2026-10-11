const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const container = "supabase_db_Otoyali-blueprint";
const run = randomUUID();
const userA = randomUUID();
const userB = randomUUID();
let listingId;

function sql(statement, allowFailure = false) {
  try {
    return execFileSync("docker", ["exec", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement], { encoding: "utf8" }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw new Error(error.stderr || error.message);
  }
}

function asUser(userId, statement, allowFailure = false) {
  return sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub" = '${userId}'; ${statement}; COMMIT;`, allowFailure);
}

function value(output) {
  return output.split("\n").filter(Boolean).findLast((line) => !["BEGIN", "SET", "COMMIT"].includes(line));
}

try {
  const model = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models m JOIN vehicle.makes mk ON mk.id=m.make_id WHERE mk.is_active AND m.is_active ORDER BY m.id LIMIT 1");
  const [makeId, modelId] = model.split("|");
  assert.ok(makeId && modelId, "local vehicle fixture is required");

  sql(`INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous, created_at, updated_at) VALUES
    ('${userA}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'launch03d3c3-a-${run}@local.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', false, false, now(), now()),
    ('${userB}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'launch03d3c3-b-${run}@local.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', false, false, now(), now());
    UPDATE public.profiles SET full_name='LOCAL RLS USER A', display_name='LOCAL RLS USER A', seller_type='private', city='Ankara' WHERE id='${userA}';
    UPDATE public.profiles SET full_name='LOCAL RLS USER B', display_name='LOCAL RLS USER B', seller_type='private', city='Ankara' WHERE id='${userB}';
    INSERT INTO identity.seller_phone_verifications (user_id, phone_e164) VALUES ('${userA}', '+905550000001');`);

  listingId = value(asUser(userA, `SELECT listing_id FROM public.create_own_private_listing_draft('${makeId}'::uuid, '${modelId}'::uuid, NULL::uuid, 2021::smallint, 1000::integer, 'used'::text, 'gasoline'::vehicle.fuel_type, 'automatic'::vehicle.transmission_type, 'sedan'::text, 'front'::text, 'LOCAL TEST'::text, 1.6::numeric, 'unknown'::text, 1::smallint, 'LOCAL_RLS_RUNTIME_${run}'::text, '1000000'::text, 'TRY'::text, false, 'Ankara'::text, NULL::uuid, NULL::uuid)`));
  assert.match(listingId, /^[0-9a-f-]{36}$/i, "owner draft creation must return an id");

  let state = sql(`SELECT seller_id || '|' || status || '|' || moderation_status || '|' || coalesce(published_at::text,'') FROM marketplace.listings WHERE id='${listingId}'`).split("|");
  assert.deepEqual(state.slice(0, 3), [userA, "draft", "draft"]);
  assert.equal(state[3], "");

  const ownRead = value(asUser(userA, `SELECT (public.get_own_listing_for_edit('${listingId}'::uuid)->'listing'->>'id') || '|' || (public.get_own_listing_for_edit('${listingId}'::uuid)->'listing'->>'status') || '|' || (public.get_own_listing_for_edit('${listingId}'::uuid)->'listing'->>'moderation_status')`));
  assert.equal(ownRead, `${listingId}|draft|draft`);

  const tokens = sql(`SELECT l.updated_at || '|' || v.updated_at FROM marketplace.listings l JOIN vehicle.vehicle_profiles v ON v.id=l.vehicle_profile_id WHERE l.id='${listingId}'`).split("|");
  const saved = value(asUser(userA, `SELECT saved_listing_id || '|' || saved_status || '|' || saved_moderation_status FROM public.save_own_listing_edit('${listingId}'::uuid, '${tokens[0]}'::timestamptz, '${tokens[1]}'::timestamptz, '${makeId}'::uuid, '${modelId}'::uuid, 2021::smallint, 1001::integer, 'used'::text, 'gasoline'::vehicle.fuel_type, 'automatic'::vehicle.transmission_type, 'sedan'::text, 'front'::text, 'LOCAL TEST'::text, 1.6::numeric, 'unknown'::text, 1::smallint, 'LOCAL_RLS_RUNTIME_UPDATED_${run}'::text, '1000000'::text, 'TRY'::text, false, 'Ankara'::text)`));
  assert.equal(saved, `${listingId}|draft|draft`);
  assert.equal(sql(`SELECT count(*) FROM marketplace.listings WHERE seller_id='${userA}' AND description LIKE 'LOCAL_RLS_RUNTIME_%'`), "1");

  // A second editor using the pre-save tokens must not overwrite the owner's
  // first save. The RPC's optimistic-lock failure rolls back its temporary
  // draft-to-pending bridge, preserving the private draft state.
  assert.equal(asUser(userA, `SELECT * FROM public.save_own_listing_edit('${listingId}'::uuid, '${tokens[0]}'::timestamptz, '${tokens[1]}'::timestamptz, '${makeId}'::uuid, '${modelId}'::uuid, 2021::smallint, 1002::integer, 'used'::text, 'gasoline'::vehicle.fuel_type, 'automatic'::vehicle.transmission_type, 'sedan'::text, 'front'::text, 'LOCAL TEST'::text, 1.6::numeric, 'unknown'::text, 1::smallint, 'LOCAL_RLS_RUNTIME_STALE_${run}'::text, '1000000'::text, 'TRY'::text, false, 'Ankara'::text)`, true), null);
  assert.equal(sql(`SELECT description || '|' || status || '|' || moderation_status FROM marketplace.listings WHERE id='${listingId}'`), `LOCAL_RLS_RUNTIME_UPDATED_${run}|draft|draft`);

  const anonDirect = value(sql(`BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM marketplace.listings WHERE id='${listingId}'; COMMIT;`));
  const anonBrowse = value(sql(`BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM marketplace.listings WHERE description LIKE 'LOCAL_RLS_RUNTIME_%'; COMMIT;`));
  assert.equal(anonDirect, "0"); assert.equal(anonBrowse, "0");
  assert.equal(value(asUser(userB, `SELECT count(*) FROM marketplace.listings WHERE id='${listingId}'`)), "0");
  assert.equal(asUser(userB, `SELECT public.get_own_listing_for_edit('${listingId}'::uuid)`, true), null);
  assert.equal(asUser(userB, `SELECT * FROM public.save_own_listing_edit('${listingId}'::uuid, now(), now(), '${makeId}'::uuid, '${modelId}'::uuid, 2021::smallint, 2::integer, 'used'::text, 'gasoline'::vehicle.fuel_type, 'automatic'::vehicle.transmission_type, 'sedan'::text, 'front'::text, 'X'::text, 1.6::numeric, 'unknown'::text, 1::smallint, 'X'::text, '1'::text, 'TRY'::text, false, 'Ankara'::text)`, true), null);
  assert.equal(asUser(userB, `SELECT * FROM public.submit_own_listing_for_review('${listingId}'::uuid)`, true), null);
  assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || seller_id FROM marketplace.listings WHERE id='${listingId}'`), `draft|draft|${userA}`);

  assert.equal(value(asUser(userA, `SELECT listing_id || '|' || status || '|' || moderation_status FROM public.submit_own_listing_for_review('${listingId}'::uuid)`)), `${listingId}|draft|pending_review`);
  assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || coalesce(published_at::text,'') FROM marketplace.listings WHERE id='${listingId}'`), "draft|pending_review|");

  console.log("LAUNCH-03D3C3 local draft runtime/RLS: PASS");
} finally {
  sql(`DELETE FROM marketplace.listings WHERE seller_id IN ('${userA}','${userB}'); DELETE FROM vehicle.profile_ownership WHERE owner_id IN ('${userA}','${userB}'); DELETE FROM vehicle.vehicle_profiles WHERE created_by IN ('${userA}','${userB}'); DELETE FROM identity.seller_phone_verifications WHERE user_id IN ('${userA}','${userB}'); DELETE FROM public.profiles WHERE id IN ('${userA}','${userB}'); DELETE FROM auth.users WHERE id IN ('${userA}','${userB}')`, true);
}
