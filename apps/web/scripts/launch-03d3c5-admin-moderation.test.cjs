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
const ids = Object.fromEntries(["owner", "ordinary", "admin", "moderator"].map((name) => [name, randomUUID()]));
const createdListings = [];
const tag = `LOCAL_C5_MODERATION_${randomUUID()}`;
const sql = (statement) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement], { encoding: "utf8" }).trim();

async function session(id, name) {
  const email = `local-c5-${name}-${id}@example.test`;
  const password = `Local-${id}-A9!`;
  const { error } = await service.auth.admin.createUser({ id, email, password, email_confirm: true });
  assert.ifError(error);
  const client = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  assert.ifError(linkError);
  const { data, error: loginError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  assert.ifError(loginError);
  assert.ok(data.session?.access_token, `${name} must receive a local session`);
  return client;
}

function count(query) { return Number(sql(query)); }
function auditCount(listingId) { return count(`SELECT count(*) FROM public.admin_audit_logs WHERE entity_type='listing' AND entity_id='${listingId}' AND action IN ('listing.approve','listing.reject')`); }

(async () => {
  try {
    const [owner, ordinary, admin, moderator] = await Promise.all([
      session(ids.owner, "owner"), session(ids.ordinary, "ordinary"), session(ids.admin, "admin"), session(ids.moderator, "moderator")
    ]);
    sql(`UPDATE public.profiles SET seller_type='private', city='Ankara' WHERE id='${ids.owner}';
      INSERT INTO identity.seller_phone_verifications(user_id, phone_e164) VALUES ('${ids.owner}','+905550000001');
      INSERT INTO public.admin_users(user_id,role,is_active) VALUES ('${ids.admin}','admin',true),('${ids.moderator}','moderator',true);`);
    const [makeId, modelId] = sql("SELECT m.make_id || '|' || m.id FROM vehicle.models m JOIN vehicle.makes mk ON mk.id=m.make_id WHERE mk.is_active AND m.is_active ORDER BY m.id LIMIT 1").split("|");
    const payload = (suffix) => ({ p_make_id: makeId, p_model_id: modelId, p_variant_id: null, p_year: 2021, p_mileage_km: 1, p_condition: "used", p_fuel_type: "gasoline", p_transmission: "automatic", p_body_type: "sedan", p_drive_type: "front", p_color: "test", p_engine_volume_l: 1.6, p_damage_state: "unknown", p_owner_count: 1, p_description: `${tag}_${suffix}`, p_price_amount_text: "1000000", p_currency: "TRY", p_price_negotiable: false, p_city: "Ankara", p_city_id: null, p_district_id: null });
    async function draft(suffix) {
      const result = await owner.rpc("create_own_private_listing_draft", payload(suffix));
      assert.ifError(result.error);
      const id = result.data?.[0]?.listing_id;
      assert.match(id || "", /^[0-9a-f-]{36}$/i);
      createdListings.push(id);
      assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (published_at IS NULL)::text FROM marketplace.listings WHERE id='${id}'`), "draft|draft|true");
      assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${id}'`), 0);
      assert.equal(count(`SELECT count(*) FROM public.ff_home_listings WHERE listing_id='${id}'`), 0);
      return id;
    }
    async function submit(id) {
      const result = await owner.rpc("submit_own_listing_for_review", { p_listing_id: id });
      assert.ifError(result.error);
      assert.deepEqual(result.data?.[0], { listing_id: id, status: "draft", moderation_status: "pending_review" });
      assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (published_at IS NULL)::text FROM marketplace.listings WHERE id='${id}'`), "draft|pending_review|true");
      assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${id}'`), 0);
      assert.equal(count(`SELECT count(*) FROM public.ff_home_listings WHERE listing_id='${id}'`), 0);
    }

    const invalidDraft = await draft("invalid");
    for (const [client, decision, name] of [[ordinary, "approve", "ordinary"], [ordinary, "reject", "ordinary"], [owner, "approve", "owner"], [owner, "reject", "owner"], [anon, "approve", "anon"], [anon, "reject", "anon"], [admin, "approve", "invalid-draft"], [admin, "reject", "invalid-draft"]]) {
      const result = await client.rpc("review_listing_moderation", { p_listing_id: invalidDraft, p_decision: decision, p_rejection_reason: decision === "reject" ? `${name} rejection` : null });
      assert.ok(result.error, `${name} ${decision} must fail`);
      assert.equal(auditCount(invalidDraft), 0, `${name} failure must not audit`);
    }
    assert.equal(sql(`SELECT status || '|' || moderation_status FROM marketplace.listings WHERE id='${invalidDraft}'`), "draft|draft");

    const approved = await draft("approve"); await submit(approved);
    const approveResult = await admin.rpc("review_listing_moderation", { p_listing_id: approved, p_decision: "approve", p_rejection_reason: null });
    assert.ifError(approveResult.error);
    assert.deepEqual(approveResult.data?.[0]?.listing_id, approved);
    assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (published_at IS NOT NULL)::text || '|' || (moderated_at IS NOT NULL)::text || '|' || moderated_by || '|' || (archived_at IS NULL)::text FROM marketplace.listings WHERE id='${approved}'`), `active|active|true|true|${ids.admin}|true`);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${approved}'`), 1);
    assert.equal(count(`SELECT count(*) FROM public.ff_home_listings WHERE listing_id='${approved}'`), 1);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_moderation_runs WHERE listing_id='${approved}'`), 0);
    assert.equal(auditCount(approved), 1);
    assert.equal(sql(`SELECT actor_user_id || '|' || action FROM public.admin_audit_logs WHERE entity_id='${approved}' AND action='listing.approve'`), `${ids.admin}|listing.approve`);
    const activeAgain = await admin.rpc("review_listing_moderation", { p_listing_id: approved, p_decision: "approve", p_rejection_reason: null });
    assert.ok(activeAgain.error, "already active approval must fail"); assert.equal(auditCount(approved), 1);
    const activeReject = await admin.rpc("review_listing_moderation", { p_listing_id: approved, p_decision: "reject", p_rejection_reason: "invalid active" });
    assert.ok(activeReject.error, "already active rejection must fail"); assert.equal(auditCount(approved), 1);

    const moderatorApproved = await draft("moderator-approve"); await submit(moderatorApproved);
    const moderatorApprove = await moderator.rpc("review_listing_moderation", { p_listing_id: moderatorApproved, p_decision: "approve", p_rejection_reason: null });
    assert.ifError(moderatorApprove.error);
    assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || moderated_by FROM marketplace.listings WHERE id='${moderatorApproved}'`), `active|active|${ids.moderator}`);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${moderatorApproved}'`), 1);
    assert.equal(auditCount(moderatorApproved), 1);

    const rejected = await draft("reject"); await submit(rejected);
    const rejectionReason = "C5 policy reason";
    const rejectResult = await moderator.rpc("review_listing_moderation", { p_listing_id: rejected, p_decision: "reject", p_rejection_reason: rejectionReason });
    assert.ifError(rejectResult.error);
    assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (published_at IS NULL)::text || '|' || rejection_reason || '|' || moderation_note || '|' || (moderated_at IS NOT NULL)::text || '|' || moderated_by FROM marketplace.listings WHERE id='${rejected}'`), `removed|rejected|true|${rejectionReason}|${rejectionReason}|true|${ids.moderator}`);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${rejected}'`), 0);
    assert.equal(count(`SELECT count(*) FROM public.ff_home_listings WHERE listing_id='${rejected}'`), 0);

    const adminRejected = await draft("admin-reject"); await submit(adminRejected);
    const adminReject = await admin.rpc("review_listing_moderation", { p_listing_id: adminRejected, p_decision: "reject", p_rejection_reason: "Admin policy reason" });
    assert.ifError(adminReject.error);
    assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || moderated_by FROM marketplace.listings WHERE id='${adminRejected}'`), `removed|rejected|${ids.admin}`);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${adminRejected}'`), 0);
    assert.equal(auditCount(adminRejected), 1);
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_moderation_runs WHERE listing_id='${rejected}'`), 0);
    assert.equal(auditCount(rejected), 1);
    assert.equal(sql(`SELECT actor_user_id || '|' || action FROM public.admin_audit_logs WHERE entity_id='${rejected}' AND action='listing.reject'`), `${ids.moderator}|listing.reject`);
    const resubmitted = await owner.rpc("resubmit_own_listing_for_review", { p_listing_id: rejected });
    assert.ifError(resubmitted.error);
    assert.deepEqual(resubmitted.data?.[0], { listing_id: rejected, status: "draft", moderation_status: "pending_review" });
    assert.equal(sql(`SELECT status || '|' || moderation_status || '|' || (published_at IS NULL)::text || '|' || (rejection_reason IS NULL)::text || '|' || (moderated_at IS NULL)::text FROM marketplace.listings WHERE id='${rejected}'`), "draft|pending_review|true|true|true");
    assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id='${rejected}'`), 0);
    assert.equal(count(`SELECT count(*) FROM public.ff_home_listings WHERE listing_id='${rejected}'`), 0);

    const archived = await draft("archived");
    const archive = await owner.rpc("archive_own_listing", { p_listing_id: archived }); assert.ifError(archive.error);
    for (const decision of ["approve", "reject"]) {
      const result = await admin.rpc("review_listing_moderation", { p_listing_id: archived, p_decision: decision, p_rejection_reason: decision === "reject" ? "invalid archived" : null });
      assert.ok(result.error, `archived ${decision} must fail`); assert.equal(auditCount(archived), 0);
    }
    assert.equal(sql(`SELECT status || '|' || moderation_status FROM marketplace.listings WHERE id='${archived}'`), "removed|archived");
    console.log("LAUNCH-03D3C5 local admin moderation PostgREST contract: PASS");
  } finally {
    if (createdListings.length) {
      const listingSet = `'${createdListings.join("','")}'`;
      sql(`DELETE FROM public.admin_audit_logs WHERE entity_type='listing' AND entity_id IN (${listingSet});
        DELETE FROM marketplace.listings WHERE id IN (${listingSet});`);
      assert.equal(count(`SELECT count(*) FROM marketplace.listings WHERE id IN (${listingSet})`), 0, "synthetic listings must be cleaned up");
      assert.equal(count(`SELECT count(*) FROM marketplace.listing_search_documents WHERE listing_id IN (${listingSet})`), 0, "synthetic search documents must be cleaned up");
      assert.equal(count(`SELECT count(*) FROM public.admin_audit_logs WHERE entity_type='listing' AND entity_id IN (${listingSet})`), 0, "synthetic audits must be cleaned up");
    }
    sql(`DELETE FROM marketplace.listings WHERE seller_id IN ('${Object.values(ids).join("','")}');
      DELETE FROM public.admin_users WHERE user_id IN ('${Object.values(ids).join("','")}');
      DELETE FROM vehicle.profile_ownership WHERE owner_id IN ('${Object.values(ids).join("','")}');
      DELETE FROM vehicle.vehicle_profiles WHERE created_by IN ('${Object.values(ids).join("','")}');
      DELETE FROM identity.seller_phone_verifications WHERE user_id IN ('${Object.values(ids).join("','")}');
      DELETE FROM public.profiles WHERE id IN ('${Object.values(ids).join("','")}');
      DELETE FROM auth.users WHERE id IN ('${Object.values(ids).join("','")}');`);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
