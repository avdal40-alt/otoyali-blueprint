const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const trustPath = path.join(root, "src", "features", "ai", "vin", "vin-trust.ts");
const trustSource = fs.readFileSync(trustPath, "utf8");
const moduleValue = { exports: {} };
const compiled = ts.transpileModule(trustSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function("exports", "module", "require", compiled)(moduleValue.exports, moduleValue, (name) => name === "server-only" ? {} : require(name));
const { inspectVinTrust, resolveVinTrustProviderStatus, notConfiguredVinTrustProvider } = moduleValue.exports;

const inspect = (patch = {}) => inspectVinTrust({ vinPresence: "missing", vinFormatStatus: "not_checked", reviewState: null, externalLookupRequested: false, externalProviderConfigured: false, externalProviderReachable: false, consentGranted: false, ...patch });
const noVin = inspect();
assert.equal(noVin.vinPresence, "missing");
assert.equal(noVin.providerStatus, "not_configured");
assert.equal(noVin.available, false);

const present = inspect({ vinPresence: "present", vinFormatStatus: "valid_structure", reviewState: "bound" });
assert.deepEqual(present.signals.slice(0, 2), [{ code: "vin_present", provenance: "seller_supplied" }, { code: "vin_format_valid", provenance: "yolmod_internal" }]);
assert.equal(inspect({ vinPresence: "present", vinFormatStatus: "invalid_structure", reviewState: "bound" }).signals.some((signal) => signal.code === "vin_format_invalid"), true);
assert.equal(resolveVinTrustProviderStatus({ vinPresence: "present", vinFormatStatus: "valid_structure", reviewState: "bound", externalLookupRequested: true, externalProviderConfigured: true, externalProviderReachable: true, consentGranted: false }), "consent_required");
assert.equal(resolveVinTrustProviderStatus({ vinPresence: "present", vinFormatStatus: "valid_structure", reviewState: "bound", externalLookupRequested: true, externalProviderConfigured: true, externalProviderReachable: false, consentGranted: true }), "unavailable");
assert.equal(notConfiguredVinTrustProvider.id, "not_configured");
assert.equal(notConfiguredVinTrustProvider.capabilities.transmitsRawVin, false);

const route = fs.readFileSync(path.join(root, "src", "app", "api", "ai", "trust", "route.ts"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src", "features", "ai", "vin", "vin-trust-runtime.ts"), "utf8");
const reader = fs.readFileSync(path.join(root, "src", "features", "ai", "vin", "vin-private-runtime.ts"), "utf8");
assert.match(route, /requireAuthenticatedRequestSupabase/);
assert.match(route, /privateApiHeaders/);
assert.match(route, /isAiFeatureEnabled\("ai_vin"\)/);
assert.match(route, /getAiRateLimiter/);
assert.match(runtime, /get_own_rejected_listing_for_edit/);
assert.match(reader, /^import "server-only";/);
assert.match(reader, /select\("checksum_state,review_state,provenance"\)/);
assert.doesNotMatch(route + runtime + trustSource, /normalized_vin|vin_fingerprint|vin_last4|\brawVin\b|console\.|\bprompt\b|\bmodel\b|service_role/i);
assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(/i);

const databaseCheck = execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc", "SELECT has_table_privilege('anon', 'vehicle.private_vins', 'SELECT'), has_table_privilege('authenticated', 'vehicle.private_vins', 'SELECT'), (SELECT relrowsecurity FROM pg_class WHERE oid = 'vehicle.private_vins'::regclass); BEGIN; SET LOCAL ROLE authenticated; DO $$ BEGIN BEGIN PERFORM normalized_vin FROM vehicle.private_vins; RAISE EXCEPTION 'unexpected private VIN read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$; ROLLBACK;"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
assert.equal(databaseCheck, "f|f|t");
console.log("AI-01F-B VIN/trust adapter and private VIN boundary passed");
