const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationsRoot = path.join(repoRoot, "supabase", "migrations");
const migrationFiles = fs.readdirSync(migrationsRoot).filter((name) => name.endsWith(".sql")).sort();
const migrations = migrationFiles.map((name) => fs.readFileSync(path.join(migrationsRoot, name), "utf8"));
const hardenedAt = migrationFiles.indexOf("20260706130000_web06_listing_publish_quality.sql");

assert.notEqual(hardenedAt, -1);
assert.match(migrations[hardenedAt], /DROP POLICY IF EXISTS profiles_select_public ON public\.profiles/);
for (const [offset, migration] of migrations.slice(hardenedAt + 1).entries()) {
  assert.doesNotMatch(
    migration,
    /CREATE POLICY profiles_select_public[\s\S]*?ON public\.profiles/,
    `${migrationFiles[hardenedAt + 1 + offset]} must not restore cross-user profile reads`
  );
}

console.log("SECURITY-FINAL profile privacy contract passed");
