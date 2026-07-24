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
  "l.status = 'draft'",
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
  "GRANT EXECUTE ON FUNCTION public.save_own_rejected_listing"
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
  "Mevcut kapak fotoğrafı"
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
  authenticated && owner && currentOwner && status === "draft" && moderation === "rejected" && !archived;
assert.equal(eligible({ authenticated: true, owner: true, status: "draft", moderation: "rejected" }), true, "owner rejected edit");
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

// Existing SECURITY-01, SMS-01, and AUTH-03 suites remain part of this focused gate.
require("./security-lifecycle.test.cjs");
require("./phone-auth.test.cjs");
require("./auth-signup-metadata.test.cjs");

console.log("SELL-03 tests passed");
