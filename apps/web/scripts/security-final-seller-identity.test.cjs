const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migration = fs.readFileSync(
  path.join(repoRoot, "supabase", "migrations", "20260827121000_security_final_seller_identity.sql"),
  "utf8"
);
const profileSource = fs.readFileSync(path.join(projectRoot, "src", "app", "profile", "_components", "ProfileClient.tsx"), "utf8");
const sellSource = fs.readFileSync(path.join(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
const sellCopySource = fs.readFileSync(path.join(projectRoot, "src", "app", "sell", "sell-copy.ts"), "utf8");
const turkishDictionary = fs.readFileSync(path.join(projectRoot, "src", "i18n", "dictionaries", "tr.ts"), "utf8");
const englishDictionary = fs.readFileSync(path.join(projectRoot, "src", "i18n", "dictionaries", "en.ts"), "utf8");

assert.match(migration, /REVOKE UPDATE \(seller_type\) ON public\.profiles FROM authenticated/);
assert.match(migration, /REVOKE UPDATE \(seller_type\) ON marketplace\.listings FROM authenticated/);
assert.match(migration, /seller_profile\.seller_type = listings\.seller_type/);
assert.doesNotMatch(profileSource, /seller_type:\s*profile\.seller_type/);
assert.doesNotMatch(sellSource, /seller_type:\s*profile\.sellerType,[\s\S]*?language: profile\.language/);
assert.match(profileSource, /helperText=\{String\(dictionary\.profile\.dealerStatusHint\)\}/);
assert.match(turkishDictionary, /dealerStatusHint:\s*"Galeri durumu doğrulama sonrasında atanır\."/);
assert.match(englishDictionary, /dealerStatusHint:\s*"Dealer status is assigned after verification\."/);
assert.match(sellSource, /helperText=\{copy\.sellerTypeVerification\}/);
assert.match(sellCopySource, /sellerTypeVerification: "Dealer status is assigned after verification\."/);

console.log("SECURITY-FINAL seller identity contract passed");
