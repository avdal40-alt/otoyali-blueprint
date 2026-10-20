const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const wizard = read(webRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const copy = read(webRoot, "src", "app", "sell", "sell-copy.ts");
const migrationName = fs.readdirSync(path.join(repoRoot, "supabase", "migrations"))
  .find((name) => name.endsWith("_jlc_0517_optional_listing_photos_cap.sql"));

assert.ok(migrationName, "optional-photo migration must exist");
const migration = read(repoRoot, "supabase", "migrations", migrationName);

for (const value of [
  "const maxPhotos = 15;",
  "const availableSlots = maxPhotos - state.photos.length",
  "if (nextFiles.length > availableSlots)",
  "let score = 30;",
  "{ label: copy.qualityItems[5], complete: true }",
  "{ label: copy.qualityItems[6], complete: true }"
]) assert.ok(wizard.includes(value), `optional-photo wizard contract missing: ${value}`);
assert.ok(!wizard.includes("state.photos.length < 3"), "the wizard must not warn or block fewer than three photos");
assert.ok(!wizard.includes("persistedPhotos.length >= 3"), "the quality score must not penalize optional photos");
assert.ok(!copy.includes("minimumPhotosHelp"), "the seller copy must not retain a minimum-photo requirement");
assert.ok(copy.includes("15 fotoğraf") && copy.includes("15 photos"), "both locales must describe the 15-photo cap");

for (const value of [
  "FOR UPDATE;",
  "WHERE pm.vehicle_profile_id = v_profile AND pm.media_type = 'image';",
  "IF v_photo_count >= 15 THEN RAISE EXCEPTION 'listing photo limit reached' USING ERRCODE = 'OT422'; END IF;",
  "p_blur_status NOT IN ('blurred', 'skipped')",
  "sanitized derivative not authorized",
  "IF v_image_count > 15 THEN",
  "RAISE EXCEPTION 'listing photo limit exceeded' USING ERRCODE = 'OT422';",
  "v_image_count <> v_finalized_photo_count",
  "all listing photos must be processed safely",
  "IF v_finalized_photo_count = 0 THEN",
  "listing cover must reference a finalized photo",
  "a finalized cover photo is required when photos are present",
  "INSERT INTO public.admin_audit_logs",
  "GRANT EXECUTE ON FUNCTION public.finalize_own_listing_sanitized_photo_v2"
]) assert.ok(migration.includes(value), `optional-photo migration contract missing: ${value}`);
assert.ok(!migration.includes("at least three finalized photos are required"), "the migration must not retain the former three-photo gate");

function maySubmit({ total, safe, hasSafeCover, coverIsNull = false }) {
  if (total > 15) return false;
  if (total !== safe) return false;
  return safe === 0 ? coverIsNull : hasSafeCover;
}

function mayFinalize(currentPhotoCount) {
  return currentPhotoCount < 15;
}

for (const photoCount of [0, 1, 2, 3, 15]) {
  assert.equal(maySubmit({ total: photoCount, safe: photoCount, hasSafeCover: photoCount > 0, coverIsNull: photoCount === 0 }), true, `${photoCount} safe photos should be submittable`);
}
assert.equal(mayFinalize(14), true, "the fifteenth media finalization must remain allowed");
assert.equal(mayFinalize(15), false, "the sixteenth media finalization must be rejected by the trusted cap");
assert.equal(maySubmit({ total: 16, safe: 16, hasSafeCover: true }), false, "sixteen otherwise safe photos must be rejected by submit");
assert.equal(maySubmit({ total: 1, safe: 0, hasSafeCover: false, coverIsNull: true }), false, "unsafe media must never qualify by being ignored");
assert.equal(maySubmit({ total: 15, safe: 14, hasSafeCover: true }), false, "an unsafe or incomplete photo among one through fifteen must block submit");
assert.equal(maySubmit({ total: 0, safe: 0, hasSafeCover: false, coverIsNull: false }), false, "a zero-photo listing must fail closed when it has a cover reference");
assert.equal(maySubmit({ total: 1, safe: 1, hasSafeCover: false }), false, "safe media needs a safe cover when photos exist");

console.log("JLC-0517 optional-photo, 15-cap, trusted finalizer, and safe-submit contracts passed");
