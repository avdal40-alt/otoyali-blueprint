const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "..", "src", "app", "sell", "sell-route-state.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath
}).outputText;
const productionModule = { exports: {} };
new Function("module", "exports", "require", compiled)(productionModule, productionModule.exports, require);

const { getSellEditTarget, isCurrentEditTarget, LatestRequestGuard } = productionModule.exports;
const listingA = "11111111-1111-4111-8111-111111111111";
const listingB = "22222222-2222-4222-8222-222222222222";

assert.deepEqual(getSellEditTarget(undefined), { kind: "create" }, "absent edit enters create mode");
assert.deepEqual(getSellEditTarget({}), { kind: "create" }, "missing edit property enters create mode");
for (const edit of ["", " ", "\t", "not-a-uuid", "11111111-1111-6111-8111-111111111111"]) {
  assert.deepEqual(getSellEditTarget({ edit }), { kind: "invalid" }, `invalid edit target rejected: ${JSON.stringify(edit)}`);
}
assert.deepEqual(getSellEditTarget({ edit: [] }), { kind: "invalid" }, "empty repeated parameter rejected");
assert.deepEqual(getSellEditTarget({ edit: [listingA, listingB] }), { kind: "invalid" }, "ambiguous repeated parameter rejected");
assert.deepEqual(getSellEditTarget({ edit: listingA }), { kind: "edit", listingId: listingA }, "valid UUID enters edit load path");

assert.equal(isCurrentEditTarget(listingA, listingA, `edit:${listingA}`, `edit:${listingA}`), true);
assert.equal(isCurrentEditTarget(listingB, listingA, `edit:${listingB}`, `edit:${listingA}`), false, "A state cannot submit to B");
assert.equal(isCurrentEditTarget(null, null, "create", "create"), false, "create mode cannot submit an edit");
assert.equal(isCurrentEditTarget(listingA, null, `edit:${listingA}`, `edit:${listingA}`), false, "unloaded edit cannot submit");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function guardedLoad(guard, target, request, state) {
  const token = guard.setTarget(`edit:${target}`);
  state.loadingTarget = target;
  state.error = null;
  try {
    const value = await request;
    if (!guard.isCurrent(token)) return;
    state.data = value;
  } catch {
    if (!guard.isCurrent(token)) return;
    state.error = `unavailable:${target}`;
  } finally {
    if (guard.isCurrent(token)) state.loadingTarget = null;
  }
}

async function run() {
  {
    const guard = new LatestRequestGuard();
    const state = { data: null, error: null, loadingTarget: null };
    const a = deferred();
    const b = deferred();
    const loadA = guardedLoad(guard, listingA, a.promise, state);
    const loadB = guardedLoad(guard, listingB, b.promise, state);
    b.resolve("B");
    await loadB;
    a.resolve("A");
    await loadA;
    assert.deepEqual(state, { data: "B", error: null, loadingTarget: null }, "late A success cannot overwrite B");
  }

  {
    const guard = new LatestRequestGuard();
    const state = { data: null, error: null, loadingTarget: null };
    const a = deferred();
    const b = deferred();
    const loadA = guardedLoad(guard, listingA, a.promise, state);
    const loadB = guardedLoad(guard, listingB, b.promise, state);
    a.reject(new Error("A failed"));
    await loadA;
    assert.equal(state.error, null, "stale A rejection cannot replace B error state");
    assert.equal(state.loadingTarget, listingB, "stale A finally cannot clear B loading state");
    b.resolve("B");
    await loadB;
    assert.equal(state.data, "B");
  }

  {
    const guard = new LatestRequestGuard();
    const state = { data: null, error: null, loadingTarget: null };
    const a = deferred();
    const loadA = guardedLoad(guard, listingA, a.promise, state);
    guard.setTarget("create");
    state.data = null;
    state.error = null;
    state.loadingTarget = null;
    a.resolve("A");
    await loadA;
    assert.deepEqual(state, { data: null, error: null, loadingTarget: null }, "A to create blocks late A population");
  }

  console.log("SELL route-state tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
