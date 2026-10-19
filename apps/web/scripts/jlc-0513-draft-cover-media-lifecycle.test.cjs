const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(
  path.join(repoRoot, "supabase", "migrations", "20261019165840_jlc_0512_allow_draft_cover_media.sql"),
  "utf8"
);

assert.match(migration, /seller_id\s*=\s*v_user_id/, "owner access must remain required");
assert.match(migration, /status\s*=\s*'draft'/, "only draft listings may set a cover");
assert.match(
  migration,
  /moderation_status\s+IN\s*\('draft',\s*'pending_review'\)/,
  "draft/draft and draft/pending_review must be supported"
);
assert.doesNotMatch(migration, /moderation_status\s+IN[^;]*(?:'active'|'rejected')/, "no lifecycle states may be broadened");
assert.match(migration, /archived_at\s+IS\s+NULL/, "archived listings must remain rejected");
assert.match(migration, /vehicle\.is_current_profile_owner\(v_vehicle_id, v_user_id\)/, "profile ownership must remain required");
assert.match(migration, /FOR UPDATE/, "listing row must remain locked during cover assignment");
assert.match(migration, /vehicle_profile_id\s*=\s*v_vehicle_id/, "foreign-profile media must remain rejected");
assert.match(migration, /is_cover\s*=\s+TRUE/, "only finalized cover media may be selected");
assert.match(migration, /invalid cover media'.*OT422/, "invalid media must retain OT422");
assert.match(migration, /UPDATE marketplace\.listings\s+SET cover_media_id = p_cover_media_id/, "cover assignment must persist");
assert.match(migration, /SECURITY DEFINER/, "security-definer behavior must remain intact");
assert.match(migration, /SET search_path = public, pg_catalog/, "safe search path must remain intact");

for (const forbidden of ["DROP ", "TRUNCATE ", "DELETE ", "ALTER TABLE", "GRANT ", "REVOKE "]) {
  assert.ok(!migration.includes(forbidden), `migration must not contain ${forbidden}`);
}

console.log("JLC-0513 draft cover-media lifecycle and security contract passed");
