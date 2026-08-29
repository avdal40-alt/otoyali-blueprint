const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationPath = path.join(repoRoot, "supabase", "migrations", "20260828120000_prod04a_release_compatibility_gate.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const compatibility = fs.readFileSync(path.join(projectRoot, "src", "lib", "release", "compatibility.ts"), "utf8");
const browserClient = fs.readFileSync(path.join(projectRoot, "src", "lib", "supabase", "client.ts"), "utf8");
const serverClient = fs.readFileSync(path.join(projectRoot, "src", "lib", "supabase", "server.ts"), "utf8");
const middleware = fs.readFileSync(path.join(projectRoot, "src", "middleware.ts"), "utf8");
const sellWizard = fs.readFileSync(path.join(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
const myListings = fs.readFileSync(path.join(projectRoot, "src", "app", "profile", "listings", "_components", "MyListingsClient.tsx"), "utf8");

for (const required of [
  "mode IN ('normal', 'maintenance', 'enforce_minimum')",
  "minimum_release BIGINT",
  "ON CONFLICT (singleton) DO NOTHING",
  "CREATE OR REPLACE FUNCTION public.enforce_release_compatibility()",
  "ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.enforce_release_compatibility'",
  "jwt_role = 'service_role'",
  "MESSAGE = 'YOLMOD_RELEASE_REQUIRED'",
  "parsed_headers ->> 'x-yolmod-release'",
  "split_part(object_name, '/', 2) = gate.storage_release_segment",
  "SET public = FALSE",
  "public.abort_release_maintenance_before_migration()"
]) {
  assert.ok(migration.includes(required), `migration must include: ${required}`);
}

for (const bucket of ["vehicle-photos", "listing-media", "listing-videos"]) {
  assert.ok(migration.includes(`bucket_id = '${bucket}'`), `${bucket} must be release-gated`);
}
assert.equal((migration.match(/public\.release_gate_allows_storage_write\(name\)/g) || []).length, 12);
assert.match(compatibility, /YOLMOD_RELEASE = "2026082801"/);
assert.match(compatibility, /YOLMOD_RELEASE_HEADER = "x-yolmod-release"/);
assert.match(compatibility, /YOLMOD_STORAGE_RELEASE_SEGMENT = `prod04a-\$\{YOLMOD_RELEASE\}`/);
assert.match(browserClient, /headers: releaseHeaders\(\)/);
assert.match(serverClient, /headers: releaseHeaders\(\)/);
assert.match(sellWizard, /releaseStoragePath\(userId,/);
assert.match(myListings, /releaseStoragePath\(userId,/);
assert.match(middleware, /NEXT_PUBLIC_YOLMOD_CUTOVER_MODE === "maintenance"/);
assert.match(middleware, /status: 503/);

const minimumRelease = 2026082801;
const releaseSegment = "prod04a-2026082801";
function allowsRequest({ mode, role = "anon", marker }) {
  if (role === "service_role") return true;
  if (mode === "normal") return true;
  if (mode === "maintenance") return false;
  return typeof marker === "string" && /^[0-9]{10}$/.test(marker) && BigInt(marker) >= BigInt(minimumRelease);
}
function allowsStorageWrite({ mode, role = "authenticated", objectName }) {
  if (role === "service_role") return true;
  if (mode === "normal") return true;
  if (mode === "maintenance") return false;
  return objectName.split("/")[1] === releaseSegment;
}

const requestMatrix = [
  ["old anonymous public read in normal", { mode: "normal" }, true],
  ["old authenticated read in normal", { mode: "normal", role: "authenticated" }, true],
  ["old authenticated mutation in normal", { mode: "normal", role: "authenticated" }, true],
  ["new candidate in pre-migration normal", { mode: "normal", role: "authenticated", marker: "2026082801" }, true],
  ["old public read in maintenance", { mode: "maintenance" }, false],
  ["old authenticated read in maintenance", { mode: "maintenance", role: "authenticated" }, false],
  ["stale authenticated session in maintenance", { mode: "maintenance", role: "authenticated" }, false],
  ["new candidate in maintenance", { mode: "maintenance", role: "authenticated", marker: "2026082801" }, false],
  ["browser admin in maintenance", { mode: "maintenance", role: "authenticated", marker: "2026082801" }, false],
  ["service role in maintenance", { mode: "maintenance", role: "service_role" }, true],
  ["post-migration missing marker", { mode: "enforce_minimum", role: "authenticated" }, false],
  ["post-migration malformed marker", { mode: "enforce_minimum", role: "authenticated", marker: "latest" }, false],
  ["post-migration old marker", { mode: "enforce_minimum", role: "authenticated", marker: "2026082800" }, false],
  ["post-migration new marker", { mode: "enforce_minimum", role: "authenticated", marker: "2026082801" }, true],
  ["post-migration anonymous new public read", { mode: "enforce_minimum", marker: "2026082801" }, true],
  ["service role post-migration", { mode: "enforce_minimum", role: "service_role" }, true]
];
for (const [name, input, expected] of requestMatrix) {
  assert.equal(allowsRequest(input), expected, name);
}

const storageMatrix = [
  ["old storage write in normal", { mode: "normal", objectName: "user/listing/file.jpg" }, true],
  ["new storage write in normal", { mode: "normal", objectName: `user/${releaseSegment}/listing/file.jpg` }, true],
  ["old storage write in maintenance", { mode: "maintenance", objectName: "user/listing/file.jpg" }, false],
  ["new storage write in maintenance", { mode: "maintenance", objectName: `user/${releaseSegment}/listing/file.jpg` }, false],
  ["old storage write post-migration", { mode: "enforce_minimum", objectName: "user/listing/file.jpg" }, false],
  ["new storage write post-migration", { mode: "enforce_minimum", objectName: `user/${releaseSegment}/listing/file.jpg` }, true],
  ["service storage operation in maintenance", { mode: "maintenance", role: "service_role", objectName: "system/file.jpg" }, true]
];
for (const [name, input, expected] of storageMatrix) {
  assert.equal(allowsStorageWrite(input), expected, name);
}

console.log(`PROD-04A static and modeled release matrix passed (${requestMatrix.length + storageMatrix.length} cases).`);
