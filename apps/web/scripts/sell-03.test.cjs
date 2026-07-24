const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const migration = read(repoRoot, "supabase", "migrations", "20260724120000_sell03_rejected_listing_editing.sql");
const wizard = read(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const page = read(projectRoot, "src", "app", "sell", "page.tsx");
const listings = read(projectRoot, "src", "app", "profile", "listings", "_components", "MyListingsClient.tsx");
const security = read(repoRoot, "supabase", "migrations", "20260721140000_security01_listing_lifecycle_hardening.sql");
const tr = read(projectRoot, "src", "i18n", "dictionaries", "tr.ts");
const en = read(projectRoot, "src", "i18n", "dictionaries", "en.ts");

function includesAll(source, values) {
  for (const value of values) assert.ok(source.includes(value), `Expected source to include: ${value}`);
}
function excludesAll(source, values) {
  for (const value of values) assert.ok(!source.includes(value), `Expected source to exclude: ${value}`);
}

includesAll(page, ["edit?: string | string[]", "editRejected", "editListingId", "SellWizard mode={mode}"]);
includesAll(listings, ["`/sell?edit=${item.id}`", "Tekrar düzenle"]);
excludesAll(listings, ["Tekrar düzenle · Yakında"]);

includesAll(migration, [
  "get_own_rejected_listing_for_edit",
  "save_own_rejected_listing",
  "auth.uid()",
  "FOR UPDATE",
  "l.seller_id = v_user_id",
  "vehicle.is_current_profile_owner",
  "l.status IN ('draft', 'removed')",
  "l.moderation_status = 'rejected'",
  "l.archived_at IS NULL",
  "RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'",
  "v_listing.updated_at IS DISTINCT FROM p_expected_updated_at",
  "UPDATE vehicle.vehicle_profiles",
  "UPDATE marketplace.listings",
  "p_fuel_type = 'electric' AND p_engine_volume_l IS NOT NULL",
  "p_fuel_type <> 'electric' AND (p_engine_volume_l IS NULL OR p_engine_volume_l <= 0)",
  "REVOKE ALL ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) FROM PUBLIC, anon, service_role, authenticated",
  "GRANT EXECUTE ON FUNCTION public.get_own_rejected_listing_for_edit(UUID) TO authenticated",
  "GRANT EXECUTE ON FUNCTION public.save_own_rejected_listing",
  "'rejection_reason', l.rejection_reason",
  "'moderation_note', l.moderation_note",
  "'title_generated', l.title_generated",
  "UPDATE marketplace.listings AS l",
  "l.status IN ('draft', 'removed')",
  "l.moderation_status = 'rejected'",
  "RETURNING l.updated_at INTO v_updated_at"
]);

// Fixed parameters and assignments prove identity, lifecycle, relationship, and media are not caller-controlled.
for (const protectedName of [
  "p_seller_id", "p_owner_id", "p_vehicle_profile_id", "p_status",
  "p_moderation_status", "p_rejection_reason", "p_moderation_note",
  "p_moderated_by", "p_moderated_at", "p_published_at", "p_archived_at", "p_created_at"
]) {
  assert.equal(migration.includes(protectedName), false, `Protected parameter forbidden: ${protectedName}`);
}
excludesAll(migration, ["INSERT INTO marketplace.listings", "INSERT INTO vehicle.vehicle_profiles", "INSERT INTO vehicle.profile_media", "DELETE FROM vehicle.profile_media"]);
excludesAll(migration, [
  "p_quality_score", "p_seller_type", "p_seller_display_name", "p_title",
  "quality_score =", "seller_type =", "seller_display_name =",
  "title =", "title_generated ="
]);
includesAll(security, [
  "v_listing.status IN ('draft', 'removed')",
  "v_listing.moderation_status = 'rejected'"
]);

includesAll(wizard, [
  'export type SellWizardMode = "create" | "editRejected"',
  'supabase.rpc("get_own_rejected_listing_for_edit"',
  'supabase.rpc("save_own_rejected_listing"',
  'supabase.rpc("resubmit_own_listing_for_review"',
  "if (saveError)",
  "if (sendForReview)",
  'setEditSaved("rejected")',
  'setEditSaved("pending_review")',
  'key === "fuelType" && value === "electric" ? { engineVolumeL: "" }',
  'state.fuelType !== "electric"',
  'p_engine_volume_l: state.fuelType === "electric" ? null',
  "existingMedia.map",
  "Mevcut kapak fotoğrafı",
  "listing.rejection_reason ?? listing.moderation_note",
  "setExistingTitle(String(listing.title ?? \"\"))",
  "setExistingTitleGenerated(Boolean(listing.title_generated))",
  'mode === "create" ? <label',
  "sell03.mediaPreserved",
  "sell03.rejectionReasonHeading"
]);
excludesAll(wizard, [
  "p_quality_score:", "p_seller_type:", "p_seller_display_name:", "p_title:",
  '.schema("marketplace")\n        .from("listings")\n        .select("status,moderation_status")'
]);
assert.ok(
  wizard.indexOf('if (saveError)') < wizard.indexOf('if (sendForReview)'),
  "A failed save must stop before resubmit"
);
assert.ok(
  wizard.indexOf('supabase.rpc("save_own_rejected_listing"') < wizard.indexOf('supabase.rpc("resubmit_own_listing_for_review"'),
  "Save must precede resubmit"
);

// Lifecycle truth table mirrors the fixed SQL eligibility predicate.
const eligible = ({ authenticated, owner, currentOwner = true, status, moderation, archived = false }) =>
  authenticated && owner && currentOwner && ["draft", "removed"].includes(status) && moderation === "rejected" && !archived;
assert.equal(eligible({ authenticated: true, owner: true, status: "draft", moderation: "rejected" }), true, "owner rejected edit");
assert.equal(eligible({ authenticated: true, owner: true, status: "removed", moderation: "rejected" }), true, "canonical rejected edit");
assert.equal(eligible({ authenticated: false, owner: true, status: "draft", moderation: "rejected" }), false, "anonymous denial");
assert.equal(eligible({ authenticated: true, owner: false, status: "draft", moderation: "rejected" }), false, "cross-user denial");
for (const row of [
  { status: "active", moderation: "active" },
  { status: "draft", moderation: "pending_review" },
  { status: "paused", moderation: "active" },
  { status: "removed", moderation: "archived" },
  { status: "draft", moderation: "rejected", archived: true }
]) {
  assert.equal(eligible({ authenticated: true, owner: true, ...row }), false, `${row.status}/${row.moderation} denial`);
}

// Electric clears and stores null; every combustion path retains displacement validation.
const normalizedDisplacement = (fuel, raw) => fuel === "electric" ? null : Number(raw);
assert.equal(normalizedDisplacement("electric", ""), null);
assert.equal(normalizedDisplacement("gasoline", "1.6"), 1.6);
assert.equal(normalizedDisplacement("diesel", "2.0"), 2);
assert.equal(normalizedDisplacement("hybrid", "1.8"), 1.8);
assert.equal(migration.includes("engine_volume_l = 1"), false, "No displacement sentinel workaround");

for (const key of [
  "listingUnavailable", "authenticationRequired", "staleConflict", "invalidVehicleFields",
  "saveProgress", "saveSuccess", "resubmitProgress", "resubmitSuccess", "resubmitFailure",
  "rejectionReasonHeading", "mediaPreserved", "electricDisplacement"
]) {
  assert.ok(tr.includes(`${key}:`), `Turkish SELL-03 key missing: ${key}`);
  assert.ok(en.includes(`${key}:`), `English SELL-03 key missing: ${key}`);
}

// Coverage classification: this suite contains static source assertions and synthetic
// logic tests only. It does not execute the application, PostgreSQL, RPC ACLs, or RLS.
console.log("SELL-03 coverage: static source assertions + synthetic logic; no runtime/database/RLS execution");

// Existing SECURITY-01, SMS-01, and AUTH-03 suites remain part of this focused gate.
require("./security-lifecycle.test.cjs");
require("./phone-auth.test.cjs");
require("./auth-signup-metadata.test.cjs");

console.log("SELL-03 tests passed");
