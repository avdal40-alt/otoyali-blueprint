const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const telemetryPath = path.join(root, "src", "lib", "observability", "telemetry.ts");
const telemetrySource = fs.readFileSync(telemetryPath, "utf8");
const resilience = fs.readFileSync(path.join(root, "src", "lib", "background-work", "resilience.ts"), "utf8");
const listingWrites = fs.readFileSync(path.join(root, "src", "lib", "listings", "server-write.ts"), "utf8");
const listingReview = fs.readFileSync(path.join(root, "src", "app", "api", "admin", "listings", "review", "route.ts"), "utf8");
const document = fs.readFileSync(path.resolve(root, "..", "..", "docs", "jolcar-control", "JLC-1505-OBSERVABILITY-SLO-READINESS.md"), "utf8");

assert.match(telemetrySource, /TELEMETRY_CONTRACT_VERSION/);
assert.match(telemetrySource, /path: TelemetryPath/);
assert.match(telemetrySource, /correlationId/);
assert.match(telemetrySource, /durationMs/);
assert.doesNotMatch(telemetrySource, /sentry|datadog|newrelic|posthog|segment/i);
assert.match(resilience, /path: "job"/);
assert.match(listingWrites, /path: "db"/);
assert.match(listingReview, /path: "api"/);
for (const heading of ["Telemetry contract", "Critical-path coverage", "Local SLO readiness"]) assert.match(document, new RegExp(heading));

const compiled = ts.transpileModule(telemetrySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const compiledModule = { exports: {} };
const logs = [];
new Function("exports", "require", "module", compiled)(compiledModule.exports, (id) => {
  if (id === "server-only") return {};
  if (id === "./safe-logger") return { safeLog: (...entry) => logs.push(entry) };
  return require(id);
}, compiledModule);

const { correlationIdFromRequest, createCorrelationId, observeOperation, recordTelemetry } = compiledModule.exports;
assert.match(createCorrelationId("job"), /^job:[A-Fa-f0-9-]{36}$/);
assert.equal(correlationIdFromRequest(new Headers({ "x-request-id": "request:1505" })), "request:1505");
assert.match(correlationIdFromRequest(new Headers({ "x-request-id": "seller@example.kz" })), /^api:/);

(async () => {
  const value = await observeOperation({ path: "api", operation: "test.operation", correlationId: "request:1505" }, async () => "ok");
  assert.equal(value, "ok");
  await observeOperation({ path: "db", operation: "test.rpc", correlationId: "db:1505" }, async () => ({ error: { code: "safe_code" } }), (result) => Boolean(result.error));
  recordTelemetry({ path: "db", operation: "test.db", correlationId: "db:1505" }, "retryable_failure", performance.now() - 3);
  assert.equal(logs.length, 3);
  assert.equal(logs[1][2].outcome, "failure");
  for (const [, event, fields] of logs) {
    assert.equal(event, "operation_telemetry");
    assert.match(fields.correlationId, /^(request|db):1505$/);
    assert.equal(typeof fields.durationMs, "number");
    assert.equal(fields.telemetryVersion, "jlc-1505-v1");
    assert.doesNotMatch(JSON.stringify(fields), /email|phone|password|secret/i);
  }
  console.log("JLC-1505 observability telemetry and SLO readiness contracts passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
