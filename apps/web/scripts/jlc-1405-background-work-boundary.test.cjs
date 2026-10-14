const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const webRoot = path.resolve(__dirname, "..");
const contractPath = path.join(webRoot, "src", "lib", "background-work", "contracts.ts");
const documentPath = path.resolve(webRoot, "..", "..", "docs", "jolcar-control", "JLC-1405-BACKGROUND-WORK-EVENT-BOUNDARY.md");
const contract = fs.readFileSync(contractPath, "utf8");
const document = fs.readFileSync(documentPath, "utf8");
const compiled = ts.transpileModule(contract, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const contractModule = { exports: {} };
Function("exports", "module", compiled)(contractModule.exports, contractModule);

for (const kind of ["image_processing", "notification_delivery", "analytics_projection", "saved_search_matching", "dealer_inventory_import", "ai_deferred_execution", "search_indexing"]) {
  assert.match(contract, new RegExp(`"${kind}"`), `contract must support ${kind}`);
}
assert.match(contract, /idempotencyKey/, "commands must carry an idempotency key");
assert.match(contract, /correlationId/, "commands must carry a correlation ID");
assert.match(contract, /actorId/, "commands must record the trusted actor");
assert.match(contract, /BackgroundWorkSubject/, "commands must use opaque subjects");
assert.match(contract, /retryable_failure/, "results must distinguish retryable failures");
assert.match(contract, /permanent_failure/, "results must distinguish permanent failures");
assert.match(contract, /assertIdentifier/, "unsafe identifiers must be rejected before dispatch");
assert.doesNotMatch(contract, /kafka|sqs|redis/i, "contract must not bind to a broker");

const validCommand = contractModule.exports.createBackgroundWorkCommand({
  version: 1,
  kind: "notification_delivery",
  idempotencyKey: "notification:123",
  correlationId: "request:456",
  actorId: "actor-789",
  subject: { kind: "notification", id: "123" },
  payload: { channel: "in_app" },
  occurredAt: "2026-10-14T00:00:00.000Z"
});
assert.equal(validCommand.kind, "notification_delivery", "valid trusted command must be retained");
assert.throws(() => contractModule.exports.createBackgroundWorkCommand({ ...validCommand, idempotencyKey: "unsafe key" }), /idempotencyKey/, "unsafe idempotency keys must be rejected");
assert.throws(() => contractModule.exports.createBackgroundWorkCommand({ ...validCommand, kind: "unknown" }), /supported background-work kind/, "unknown work kinds must be rejected");
assert.throws(() => contractModule.exports.createBackgroundWorkCommand({ ...validCommand, occurredAt: "2026-10-14" }), /occurredAt/, "non-ISO timestamps must be rejected");

for (const heading of ["Blocking-path inventory", "Failure modes and rollout"]) {
  assert.match(document, new RegExp(heading), `document must include ${heading}`);
}
for (const protectedBoundary of ["authorization", "RLS", "Search v1", "idempotent", "PostgreSQL remains the source of truth"]) {
  assert.match(document, new RegExp(protectedBoundary, "i"), `document must preserve ${protectedBoundary}`);
}
assert.doesNotMatch(document, /introduce.*(?:Kafka|SQS|Redis)/i, "document must not introduce a broker");

console.log(JSON.stringify({ contract: "provider-neutral", inventory: 7, broker: "not introduced" }));
