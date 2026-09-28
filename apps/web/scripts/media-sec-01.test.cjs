const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260923202053_media_sec_01_sanitized_public_photo_contract.sql"), "utf8"); const corrective = fs.readFileSync(path.join(root, "supabase", "migrations", "20260923202233_media_sec_01_disable_legacy_unsanitized_attach.sql"), "utf8");
for (const value of ["privacy_version", "temp", "public", "finalize_own_listing_sanitized_photo", "auth.uid()", "privacy_version=1", "owner_id IS NULL", "REVOKE ALL", "GRANT EXECUTE"]) assert.match(migration, new RegExp(value));
assert.match(corrective, /REVOKE EXECUTE ON FUNCTION public\.attach_own_listing_media/);
assert.doesNotMatch(migration, /service_role.*GRANT EXECUTE/i);
console.log("MEDIA-SEC-01 sanitized public photo contract passed");
