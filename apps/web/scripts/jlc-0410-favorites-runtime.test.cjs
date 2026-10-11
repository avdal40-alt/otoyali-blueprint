const assert = require("node:assert/strict");
const { execFileSync, execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const root = path.resolve(__dirname, "../../..");
const env = Object.fromEntries(
  execSync("npx supabase status -o env", { cwd: root, encoding: "utf8" })
    .matchAll(/^(\w+)="([^"]*)"$/gm)
    .map(([, key, value]) => [key, value])
);

assert.match(env.API_URL || "", /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/, "refusing non-local Supabase URL");

const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ids = Object.fromEntries(["seller", "buyer", "otherBuyer"].map((name) => [name, randomUUID()]));
const tag = `LOCAL_JLC_0410_${randomUUID()}`;
let listingId = null;

const sql = (statement) => execFileSync(
  "docker",
  ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement],
  { encoding: "utf8" }
).trim();
const count = (statement) => Number(sql(statement));

async function session(id, name) {
  const email = `local-jlc-0410-${name}-${id}@example.test`;
  const password = `Local-${id}-A9!`;
  const { error: createError } = await service.auth.admin.createUser({ id, email, password, email_confirm: true });
  assert.ifError(createError);

  const client = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  assert.ifError(linkError);
  const { error: loginError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  assert.ifError(loginError);
  return client;
}

(async () => {
  try {
    const [seller, buyer, otherBuyer] = await Promise.all([
      session(ids.seller, "seller"),
      session(ids.buyer, "buyer"),
      session(ids.otherBuyer, "other-buyer")
    ]);
    assert.ok(seller, "seller session fixture must be established");
    // The current inherited draft contract still validates legacy seller-phone
    // fixtures; this test exercises favorites only and does not assert phone policy.
    sql(`UPDATE public.profiles SET seller_type='private', city='Almaty' WHERE id='${ids.seller}';
      INSERT INTO identity.seller_phone_verifications(user_id, phone_e164) VALUES ('${ids.seller}','+905550000410');`);

    const [makeId, modelId] = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models AS m JOIN vehicle.makes AS mk ON mk.id=m.make_id WHERE mk.is_active AND m.is_active ORDER BY m.id LIMIT 1").split("|");
    const { data: listing, error: listingError } = await seller.rpc("create_own_private_listing_draft", {
      p_make_id: makeId,
      p_model_id: modelId,
      p_variant_id: null,
      p_year: 2021,
      p_mileage_km: 1,
      p_condition: "used",
      p_fuel_type: "gasoline",
      p_transmission: "automatic",
      p_body_type: "sedan",
      p_drive_type: "front",
      p_color: "test",
      p_engine_volume_l: 1.6,
      p_damage_state: "unknown",
      p_owner_count: 1,
      p_description: tag,
      p_price_amount_text: "1000000",
      p_currency: "KZT",
      p_price_negotiable: false,
      p_city: "Almaty",
      p_city_id: null,
      p_district_id: null
    });
    assert.ifError(listingError);
    listingId = listing?.[0]?.listing_id;
    assert.match(listingId || "", /^[0-9a-f-]{36}$/i, "seller draft fixture must be created through the canonical contract");

    const add = await buyer.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ifError(add.error);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_favorites WHERE user_id='${ids.buyer}' AND listing_id='${listingId}'`), 1, "buyer favorite must persist");

    const ownRead = await buyer.schema("marketplace").from("listing_favorites").select("user_id,listing_id").eq("listing_id", listingId);
    assert.ifError(ownRead.error);
    assert.deepEqual(ownRead.data, [{ user_id: ids.buyer, listing_id: listingId }], "buyer must read only their own favorite");

    const duplicate = await buyer.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ok(duplicate.error, "duplicate favorite must be rejected");
    const spoofed = await otherBuyer.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ok(spoofed.error, "authenticated non-owner cannot create another buyer's favorite");
    const hiddenFromOther = await otherBuyer.schema("marketplace").from("listing_favorites").select("id").eq("listing_id", listingId);
    assert.ifError(hiddenFromOther.error);
    assert.deepEqual(hiddenFromOther.data, [], "other buyers cannot read another buyer's favorite");
    const nonOwnerDelete = await otherBuyer.schema("marketplace").from("listing_favorites").delete().eq("user_id", ids.buyer).eq("listing_id", listingId).select("id");
    assert.ifError(nonOwnerDelete.error);
    assert.deepEqual(nonOwnerDelete.data, [], "other buyers cannot delete another buyer's favorite");
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_favorites WHERE user_id='${ids.buyer}' AND listing_id='${listingId}'`), 1, "non-owner delete attempt must not mutate the favorite");

    const anonymousRead = await anon.schema("marketplace").from("listing_favorites").select("id").eq("listing_id", listingId);
    assert.ok(anonymousRead.error, "anonymous users cannot read favorites");
    const anonymousInsert = await anon.schema("marketplace").from("listing_favorites").insert({ user_id: ids.buyer, listing_id: listingId });
    assert.ok(anonymousInsert.error, "anonymous users cannot create favorites");

    const remove = await buyer.schema("marketplace").from("listing_favorites").delete().eq("listing_id", listingId).select("id");
    assert.ifError(remove.error);
    assert.equal(remove.data?.length, 1, "buyer must be able to remove their own favorite");
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_favorites WHERE user_id='${ids.buyer}' AND listing_id='${listingId}'`), 0, "removed favorite must not persist");
    console.log("JLC-0410 favorites local runtime/RLS: PASS");
  } finally {
    if (listingId) {
      sql(`DELETE FROM marketplace.listings WHERE id='${listingId}'`);
    }
    const users = Object.values(ids).map((id) => `'${id}'`).join(",");
    sql(`DELETE FROM vehicle.profile_ownership WHERE owner_id IN (${users});
      DELETE FROM vehicle.vehicle_profiles WHERE created_by IN (${users});
      DELETE FROM identity.seller_phone_verifications WHERE user_id IN (${users});
      DELETE FROM public.profiles WHERE id IN (${users});
      DELETE FROM auth.users WHERE id IN (${users});`);
    const residual = count(`SELECT count(*) FROM auth.users WHERE id IN (${users})`) + count(`SELECT count(*) FROM marketplace.listings WHERE seller_id IN (${users})`);
    assert.equal(residual, 0, "JLC-0410 fixtures must be fully cleaned up");
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
