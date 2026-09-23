const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260923110200_functional_03c_b1a_video_upload_intent_cleanup.sql"), "utf8");
for (const token of ["revoke_own_listing_video_upload_intent", "p_listing_id UUID", "p_intent_id UUID", "auth.uid()", "FOR UPDATE", "SET revoked_at = NOW()", "RETURN QUERY SELECT v_intent.object_path", "GRANT EXECUTE"]) assert.ok(migration.includes(token), token);
execFileSync(process.execPath, [path.join(__dirname, "functional-03c-b1.test.cjs")], { stdio: "inherit" });
console.log("FUNCTIONAL-03C-B1A upload intent cleanup/revoke matrix passed");
