const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const contractsPath = path.join(root, "src", "lib", "background-work", "contracts.ts");
const resiliencePath = path.join(root, "src", "lib", "background-work", "resilience.ts");
const documentPath = path.resolve(root, "..", "..", "docs", "jolcar-control", "JLC-1504-RELIABILITY-RESILIENCE.md");
const contracts = fs.readFileSync(contractsPath, "utf8");
const resilience = fs.readFileSync(resiliencePath, "utf8");
const document = fs.readFileSync(documentPath, "utf8");

assert.match(contracts, /idempotencyKey/);
assert.match(contracts, /AbortSignal/);
assert.match(resilience, /BACKGROUND_WORK_RETRY_POLICY_VERSION/);
assert.match(resilience, /controller\.abort\(\)/);
assert.match(resilience, /idempotency_key_mismatch/);
assert.match(resilience, /process memory is never used as an idempotency store/);
for (const heading of ["Failure boundaries", "Retry and idempotency policy", "Current provider isolation"]) assert.match(document, new RegExp(heading));
assert.doesNotMatch(resilience, /kafka|sqs|redis/i);

const contractJs = ts.transpileModule(contracts, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const contractModule = { exports: {} };
new Function("exports", "module", "require", contractJs)(contractModule.exports, contractModule, (name) => name === "server-only" ? {} : require(name));
const resilienceJs = ts.transpileModule(resilience, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const resilienceModule = { exports: {} };
new Function("exports", "module", "require", resilienceJs)(resilienceModule.exports, resilienceModule, (name) => {
  if (name === "server-only") return {};
  if (name === "./contracts") return contractModule.exports;
  if (name === "../observability/telemetry") return { recordTelemetry: () => {} };
  return require(name);
});

const command = contractModule.exports.createBackgroundWorkCommand({ version: 1, kind: "notification_delivery", idempotencyKey: "notification:1504", correlationId: "request:1504", actorId: "actor-1504", subject: { kind: "notification", id: "1504" }, payload: { channel: "in_app" }, occurredAt: "2026-10-15T00:00:00.000Z" });
const policy = { maxAttempts: 3, timeoutMs: 100, baseBackoffMs: 1, maxBackoffMs: 4 };

(async () => {
  const attempts = [];
  const sleeps = [];
  const recovered = await resilienceModule.exports.dispatchBackgroundWorkWithResilience({ dispatch: async (received, context) => { attempts.push({ key: received.idempotencyKey, attempt: context.attempt }); return context.attempt < 3 ? { status: "retryable_failure", idempotencyKey: received.idempotencyKey, retryAfterSeconds: 1 } : { status: "completed", idempotencyKey: received.idempotencyKey }; } }, command, policy, async (milliseconds) => sleeps.push(milliseconds));
  assert.deepEqual(recovered, { attempts: 3, result: { status: "completed", idempotencyKey: "notification:1504" } });
  assert.deepEqual(attempts, [{ key: "notification:1504", attempt: 1 }, { key: "notification:1504", attempt: 2 }, { key: "notification:1504", attempt: 3 }]);
  assert.deepEqual(sleeps, [1, 2]);

  let permanentAttempts = 0;
  const permanent = await resilienceModule.exports.dispatchBackgroundWorkWithResilience({ dispatch: async (received) => { permanentAttempts += 1; return { status: "permanent_failure", idempotencyKey: received.idempotencyKey, reason: "invalid_payload" }; } }, command, policy);
  assert.equal(permanentAttempts, 1);
  assert.equal(permanent.result.status, "permanent_failure");

  const mismatch = await resilienceModule.exports.dispatchBackgroundWorkWithResilience({ dispatch: async () => ({ status: "completed", idempotencyKey: "wrong-key" }) }, command, policy);
  assert.deepEqual(mismatch.result, { status: "permanent_failure", idempotencyKey: "notification:1504", reason: "idempotency_key_mismatch" });

  let observedAbort = false;
  const timedOut = await resilienceModule.exports.dispatchBackgroundWorkWithResilience({ dispatch: async (_received, context) => await new Promise((_resolve, reject) => context.signal.addEventListener("abort", () => { observedAbort = true; reject(new Error("aborted")); }, { once: true })) }, command, { ...policy, maxAttempts: 1, timeoutMs: 100 });
  assert.equal(observedAbort, true);
  assert.equal(timedOut.result.status, "retryable_failure");
  assert.equal(timedOut.attempts, 1);
  console.log("JLC-1504 resilience failure-injection, idempotency, and degradation contracts passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
