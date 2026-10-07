const assert = require("node:assert/strict");
const { execFileSync, execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const root = path.resolve(__dirname, "../../..");
const env = Object.fromEntries(execSync("npx supabase status -o env", { cwd: root, encoding: "utf8" }).matchAll(/^(\w+)="([^"]*)"$/gm).map(([, key, value]) => [key, value]));
assert.match(env.API_URL || "", /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/, "refusing non-local Supabase URL");
const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ids = Object.fromEntries(["seller", "buyer", "admin"].map((name) => [name, randomUUID()]));
const tag = `LOCAL_C6_PUBLIC_${randomUUID()}`;
let listingId = null;
const sql = (statement) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement], { encoding: "utf8" }).trim();
const count = (statement) => Number(sql(statement));

async function session(id, name) {
  const email = `local-c6-${name}-${id}@example.test`;
  const password = `Local-${id}-A9!`;
  const { error } = await service.auth.admin.createUser({ id, email, password, email_confirm: true });
  assert.ifError(error);
  const client = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  assert.ifError(linkError);
  const { error: loginError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  assert.ifError(loginError);
  return client;
}

(async () => {
  try {
    const [seller, buyer, admin] = await Promise.all([session(ids.seller, "seller"), session(ids.buyer, "buyer"), session(ids.admin, "admin")]);
    sql(`UPDATE public.profiles SET seller_type='private', city='Ankara' WHERE id='${ids.seller}';
      INSERT INTO identity.seller_phone_verifications(user_id, phone_e164) VALUES ('${ids.seller}','+905550000006');
      INSERT INTO public.admin_users(user_id,role,is_active) VALUES ('${ids.admin}','admin',true);`);
    const [makeId, modelId] = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models m JOIN vehicle.makes mk ON mk.id=m.make_id WHERE mk.is_active AND m.is_active ORDER BY m.id LIMIT 1").split("|");
    const create = await seller.rpc("create_own_private_listing_draft", {
      p_make_id: makeId, p_model_id: modelId, p_variant_id: null, p_year: 2021, p_mileage_km: 1,
      p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic", p_body_type: "sedan",
      p_drive_type: "front", p_color: "test", p_engine_volume_l: 1.6, p_damage_state: "unknown", p_owner_count: 1,
      p_description: tag, p_price_amount_text: "1000000", p_currency: "TRY", p_price_negotiable: false, p_city: "Ankara", p_city_id: null, p_district_id: null
    });
    assert.ifError(create.error);
    listingId = create.data?.[0]?.listing_id;
    assert.match(listingId || "", /^[0-9a-f-]{36}$/i);
    const submit = await seller.rpc("submit_own_listing_for_review", { p_listing_id: listingId });
    assert.ifError(submit.error);
    const approve = await admin.rpc("review_listing_moderation", { p_listing_id: listingId, p_decision: "approve", p_rejection_reason: null });
    assert.ifError(approve.error);
    assert.equal(sql(`SELECT status || '|' || moderation_status FROM marketplace.listings WHERE id='${listingId}'`), "active|active");

    const publicDetail = await anon.from("ff_listing_details").select("*").eq("listing_id", listingId).maybeSingle();
    assert.ifError(publicDetail.error);
    assert.equal(publicDetail.data?.listing_id, listingId, "anonymous detail must expose the approved listing");
    for (const field of ["seller_id", "phone", "email", "moderation_note", "rejection_reason", "moderated_by"]) assert.equal(Object.hasOwn(publicDetail.data, field), false, `public detail must not expose ${field}`);
    const hiddenIdentity = await anon.from("ff_listing_details").select("seller_id").eq("listing_id", listingId);
    assert.ok(hiddenIdentity.error, "PostgREST must reject selecting the removed seller_id column");
    const buyerDetail = await buyer.from("ff_listing_details").select("*").eq("listing_id", listingId).maybeSingle();
    assert.ifError(buyerDetail.error);
    assert.equal(buyerDetail.data?.listing_id, listingId, "authenticated buyer detail must remain available");
    assert.equal(Object.hasOwn(buyerDetail.data, "seller_id"), false, "buyer detail must not need seller identity");
    const publicHome = await anon.from("ff_home_listings").select("*").eq("listing_id", listingId).maybeSingle();
    assert.ifError(publicHome.error);
    for (const field of ["seller_id", "phone", "email"]) assert.equal(Object.hasOwn(publicHome.data, field), false, `public home must not expose ${field}`);

    const favorite = await buyer.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ifError(favorite.error);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_favorites WHERE user_id='${ids.buyer}' AND listing_id='${listingId}'`), 1);
    const duplicateFavorite = await buyer.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ok(duplicateFavorite.error, "buyer duplicate favorite must be protected");
    const anonymousFavorite = await anon.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ok(anonymousFavorite.error, "anonymous favorite must be blocked");
    const contact = await buyer.rpc("get_listing_seller_contact", { p_listing_id: listingId });
    assert.ifError(contact.error);
    assert.match(contact.data?.[0]?.phone || "", /^\+905550000006$/, "buyer contact must resolve only through the protected RPC");
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_favorites WHERE user_id='${ids.buyer}' AND listing_id='${listingId}'`), 1, "contact must not mutate favorite state");
    const unfavorite = await buyer.schema("marketplace").from("listing_favorites").delete().eq("user_id", ids.buyer).eq("listing_id", listingId);
    assert.ifError(unfavorite.error);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_favorites WHERE user_id='${ids.buyer}' AND listing_id='${listingId}'`), 0);
    const selfContact = await seller.rpc("get_listing_seller_contact", { p_listing_id: listingId });
    assert.ifError(selfContact.error);
    assert.deepEqual(selfContact.data, [], "seller self-contact must be blocked by the RPC");
    const anonymousContact = await anon.rpc("get_listing_seller_contact", { p_listing_id: listingId });
    assert.ok(anonymousContact.error, "anonymous contact must be rejected");
    console.log("LAUNCH-03D3C6 local public buyer E2E contract: PASS");
  } finally {
    if (listingId) {
      sql(`DELETE FROM marketplace.listing_favorites WHERE listing_id='${listingId}';
        DELETE FROM public.admin_audit_logs WHERE entity_type='listing' AND entity_id='${listingId}';
        DELETE FROM marketplace.listings WHERE id='${listingId}';`);
    }
    const users = Object.values(ids).map((id) => `'${id}'`).join(",");
    sql(`DELETE FROM public.admin_users WHERE user_id IN (${users});
      DELETE FROM marketplace.listings WHERE seller_id IN (${users});
      DELETE FROM vehicle.profile_ownership WHERE owner_id IN (${users});
      DELETE FROM vehicle.vehicle_profiles WHERE created_by IN (${users});
      DELETE FROM identity.seller_phone_verifications WHERE user_id IN (${users});
      DELETE FROM public.profiles WHERE id IN (${users});
      DELETE FROM auth.users WHERE id IN (${users});`);
    const residual = count(`SELECT count(*) FROM auth.users WHERE id IN (${users})`) + count(`SELECT count(*) FROM marketplace.listings WHERE seller_id IN (${users})`);
    assert.equal(residual, 0, "C6 fixtures must be fully cleaned up");
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
