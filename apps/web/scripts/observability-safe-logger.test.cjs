const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/observability/safe-logger.ts"), "utf8");
assert.match(source, /JSON\.stringify/);
assert.match(source, /console\.error\(output\)/);
assert.match(source, /password\|token\|secret/);
assert.match(source, /EMAIL/);
assert.match(source, /PHONE/);
assert.doesNotMatch(source, /sentry|datadog|newrelic|posthog|segment/i);
assert.match(source, /WeakSet<object>/);
const listing = fs.readFileSync(path.join(root, "src/lib/listings/server-write.ts"), "utf8");
assert.match(listing, /safeLog\(/);
assert.doesNotMatch(listing, /console\.(log|warn|error)\(/);
for (const route of [
  "src/app/api/admin/listings/review/route.ts",
  "src/app/api/admin/service-applications/review/route.ts"
]) {
  const routeSource = fs.readFileSync(path.join(root, route), "utf8");
  assert.match(routeSource, /safeLog\(/);
  assert.doesNotMatch(routeSource, /console\.(log|warn|error)\(/);
  assert.match(routeSource, /genericReviewError/);
}

const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled)(compiledModule.exports, (id) => id === "server-only" ? {} : require(id), compiledModule);
const { redactLogValue, safeLog } = compiledModule.exports;
const circular = { email: "seller@example.kz", phone: "+7 701 123 45 67", nested: { authorization: "Bearer secret" }, amount: 4n };
circular.self = circular;
const redacted = redactLogValue(circular);
assert.deepEqual(redacted, { email: "[redacted]", phone: "[redacted]", nested: { authorization: "[redacted]" }, amount: "4", self: "[circular]" });
const originalError = console.error;
let output = "";
console.error = (value) => { output = value; };
safeLog("error", "listing_write_failed", { userId: "abc", error: "owner@example.kz +7 701 123 45 67" });
console.error = originalError;
assert.doesNotMatch(output, /abc|owner@example\.kz|701 123/);
assert.match(output, /listing_write_failed/);
console.log("Observability safe logging and redaction contract passed");
