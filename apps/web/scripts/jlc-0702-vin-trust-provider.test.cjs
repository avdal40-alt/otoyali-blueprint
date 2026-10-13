const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const trustPath = path.join(root, "src", "features", "ai", "vin", "vin-trust.ts");
const trustSource = fs.readFileSync(trustPath, "utf8");
const runtimeSource = fs.readFileSync(path.join(root, "src", "features", "ai", "vin", "vin-trust-runtime.ts"), "utf8");
const readerSource = fs.readFileSync(path.join(root, "src", "features", "ai", "vin", "vin-private-runtime.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "src", "app", "api", "ai", "trust", "route.ts"), "utf8");

assert.match(trustSource, /^import "server-only";/);
assert.match(runtimeSource, /^import "server-only";/);
assert.match(readerSource, /^import "server-only";/);
assert.match(trustSource, /export interface VinTrustProvider/);
assert.match(trustSource, /requiresExplicitConsent: true/);
assert.match(trustSource, /transmitsRawVin: false/);
assert.doesNotMatch(trustSource + runtimeSource + readerSource + routeSource, /process\.env\.(?!NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)|fetch\(|axios|provider[_-]?key|api[_-]?key/i);

const compiled = ts.transpileModule(trustSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleValue = { exports: {} };
new Function("exports", "module", "require", compiled)(moduleValue.exports, moduleValue, (name) => name === "server-only" ? {} : require(name));
const { notConfiguredVinTrustProvider } = moduleValue.exports;

const inspection = notConfiguredVinTrustProvider.inspect({
  vinPresence: "present",
  vinFormatStatus: "valid_structure",
  reviewState: "bound",
  externalLookupRequested: false,
  externalProviderConfigured: false,
  externalProviderReachable: false,
  consentGranted: false
});
assert.equal(inspection.providerStatus, "not_configured");
assert.equal(inspection.externalHistoryStatus, "not_available");
assert.deepEqual(Object.keys(inspection).sort(), ["available", "consentRequired", "externalHistoryStatus", "providerStatus", "signals", "vinFormatStatus", "vinPresence"]);
assert.doesNotMatch(JSON.stringify(inspection), /normalized_vin|vin_fingerprint|vin_last4|rawVin/i);

assert.match(routeSource, /requireAuthenticatedRequestSupabase/);
assert.match(routeSource, /requestSchema = z\.object\(\{ listingId: z\.string\(\)\.uuid\(\) \}\)\.strict\(\)/);
assert.doesNotMatch(routeSource + runtimeSource, /normalized_vin|vin_fingerprint|vin_last4|rawVin|\.from\("private_vins"\)/i);
assert.match(readerSource, /select\("checksum_state,review_state,provenance"\)/);

const databaseCheck = execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc", [
  "SELECT has_table_privilege('anon', 'vehicle.private_vins', 'SELECT'), has_table_privilege('authenticated', 'vehicle.private_vins', 'SELECT'), (SELECT relrowsecurity FROM pg_class WHERE oid = 'vehicle.private_vins'::regclass);",
  "SELECT count(*) FROM pg_views WHERE schemaname IN ('public', 'marketplace') AND definition ILIKE '%private_vins%';"
].join(" ")], { encoding: "utf8" }).trim().split(/\r?\n/);
assert.deepEqual(databaseCheck, ["f|f|t", "0"]);

console.log("JLC-0702 VIN trust provider boundary and public derived-signal privacy passed");
