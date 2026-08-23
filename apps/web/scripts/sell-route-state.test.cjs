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

function createInstance(target) {
  const instance = {
    mounted: true,
    route: new LatestRequestGuard(),
    submission: new LatestRequestGuard(),
    models: new LatestRequestGuard()
  };
  setRoute(instance, target);
  return instance;
}

function setRoute(instance, target) {
  instance.route.setTarget(target);
  instance.submission.setTarget(target);
  instance.models.setTarget(`route:${target}`);
}

function unmount(instance) {
  instance.mounted = false;
  instance.route.invalidate();
  instance.submission.invalidate();
  instance.models.invalidate();
}

function isCurrent(instance, routeToken, guard, operationToken) {
  return instance.mounted
    && instance.route.isCurrent(routeToken)
    && guard.isCurrent(operationToken);
}

async function guardedLoad(instance, target, request, state) {
  setRoute(instance, `edit:${target}`);
  const token = instance.route.currentToken();
  state.loadingTarget = target;
  state.error = null;
  try {
    const value = await request;
    if (!instance.mounted || !instance.route.isCurrent(token)) return;
    state.data = value;
  } catch {
    if (!instance.mounted || !instance.route.isCurrent(token)) return;
    state.error = `unavailable:${target}`;
  } finally {
    if (instance.mounted && instance.route.isCurrent(token)) state.loadingTarget = null;
  }
}

async function guardedSubmission(instance, target, firstStep, secondStep, state) {
  const routeToken = instance.route.currentToken();
  const token = instance.submission.begin(target);
  const current = () => isCurrent(instance, routeToken, instance.submission, token);
  state.submitting = true;
  state.loadingGeneration = token.generation;
  try {
    await firstStep;
    if (!current()) return;
    state.firstStepCommits += 1;
    if (secondStep) {
      if (!current()) return;
      state.nextMutations += 1;
      await secondStep;
      if (!current()) return;
    }
    state.success = target;
  } catch {
    if (!current()) return;
    state.error = target;
  } finally {
    if (current() && state.loadingGeneration === token.generation) {
      state.submitting = false;
      state.loadingGeneration = null;
    }
  }
}

async function guardedModel(instance, make, request, state) {
  const routeToken = instance.route.currentToken();
  const token = instance.models.begin(`make:${make}`);
  const current = () => isCurrent(instance, routeToken, instance.models, token);
  state.loadingGeneration = token.generation;
  state.loading = true;
  state.error = null;
  try {
    const models = await request;
    if (!current()) return;
    state.models = models;
  } catch {
    if (!current()) return;
    state.error = make;
    state.models = [];
  } finally {
    if (current() && state.loadingGeneration === token.generation) {
      state.loading = false;
      state.loadingGeneration = null;
    }
  }
}

function clearModels(instance, state) {
  instance.models.invalidate();
  state.models = [];
  state.error = null;
  state.loading = false;
  state.loadingGeneration = null;
}

function submissionState() {
  return {
    firstStepCommits: 0,
    nextMutations: 0,
    success: null,
    error: null,
    submitting: false,
    loadingGeneration: null
  };
}

async function run() {
  {
    const instance = createInstance(`edit:${listingA}`);
    const a1 = instance.route.currentToken();
    setRoute(instance, `edit:${listingB}`);
    assert.equal(instance.route.isCurrent(a1), false, "A to B makes A stale");
    const b = instance.route.currentToken();
    setRoute(instance, `edit:${listingA}`);
    const a2 = instance.route.currentToken();
    assert.equal(instance.route.isCurrent(a1), false, "A1 to B to A2 never resurrects A1");
    assert.equal(instance.route.isCurrent(b), false, "B is stale after returning to A");
    assert.equal(instance.route.isCurrent(a2), true, "A2 is current");
    setRoute(instance, "create");
    assert.equal(instance.route.isCurrent(a2), false, "A to create invalidates A");
  }

  {
    const oldInstance = createInstance(`edit:${listingA}`);
    const oldToken = oldInstance.route.currentToken();
    unmount(oldInstance);
    assert.equal(oldInstance.route.isCurrent(oldToken), false, "invalid-route unmount permanently invalidates A");
    const newInstance = createInstance(`edit:${listingA}`);
    assert.equal(newInstance.route.isCurrent(newInstance.route.currentToken()), true, "remounted A has an independent current token");
    assert.equal(oldInstance.route.isCurrent(oldToken), false, "new instance cannot resurrect the old component token");
  }

  {
    const instance = createInstance("create");
    const c1 = instance.route.currentToken();
    setRoute(instance, `edit:${listingB}`);
    assert.equal(instance.route.isCurrent(c1), false, "create C1 is invalid after edit B");
  }

  {
    const instance = createInstance("create");
    const c1 = instance.route.currentToken();
    unmount(instance);
    assert.equal(instance.route.isCurrent(c1), false, "create C1 is invalid after invalid-route unmount");
    const c2 = createInstance("create");
    assert.equal(c2.route.isCurrent(c2.route.currentToken()), true, "create remount C2 is independently current");
    assert.equal(instance.route.isCurrent(c1), false, "create ABA cannot resurrect C1");
  }

  {
    const instance = createInstance(`edit:${listingA}`);
    const state = { data: null, error: null, loadingTarget: null };
    const a = deferred();
    const b = deferred();
    const loadA = guardedLoad(instance, listingA, a.promise, state);
    const loadB = guardedLoad(instance, listingB, b.promise, state);
    b.resolve("B");
    await loadB;
    a.resolve("A");
    await loadA;
    assert.deepEqual(state, { data: "B", error: null, loadingTarget: null }, "late A success cannot overwrite B");
  }

  {
    const instance = createInstance(`edit:${listingA}`);
    const state = submissionState();
    const save = deferred();
    const resubmit = deferred();
    const operation = guardedSubmission(instance, `edit:${listingA}`, save.promise, resubmit.promise, state);
    setRoute(instance, `edit:${listingB}`);
    save.resolve();
    await operation;
    assert.equal(state.nextMutations, 0, "edit save A resolving after B cannot resubmit A");
    assert.equal(state.success, null, "stale edit success is ignored");
  }

  {
    const instance = createInstance(`edit:${listingA}`);
    const state = submissionState();
    const save = deferred();
    const operation = guardedSubmission(instance, `edit:${listingA}`, save.promise, Promise.resolve(), state);
    unmount(instance);
    save.resolve();
    await operation;
    assert.equal(state.nextMutations, 0, "edit save A resolving after unmount cannot resubmit A");
  }

  for (const staleRoute of [`edit:${listingB}`, "invalid"]) {
    const instance = createInstance("create");
    const state = submissionState();
    const createStep = deferred();
    const operation = guardedSubmission(instance, "create", createStep.promise, Promise.resolve(), state);
    if (staleRoute === "invalid") unmount(instance);
    else setRoute(instance, staleRoute);
    createStep.resolve();
    await operation;
    assert.equal(state.nextMutations, 0, `create step resolving after ${staleRoute} cannot start the next mutation`);
    assert.equal(state.success, null, `create success after ${staleRoute} is ignored`);
  }

  {
    const instance = createInstance("create");
    const state = submissionState();
    const stale = deferred();
    const current = deferred();
    const oldOperation = guardedSubmission(instance, "create", stale.promise, null, state);
    const newOperation = guardedSubmission(instance, "create", current.promise, null, state);
    stale.reject(new Error("old failure"));
    await oldOperation;
    assert.equal(state.error, null, "stale submission error is ignored");
    assert.equal(state.submitting, true, "stale finally cannot clear current submitting state");
    current.resolve();
    await newOperation;
    assert.equal(state.success, "create", "current publication succeeds normally");
    assert.equal(state.submitting, false, "current publication clears its own submitting state");
  }

  {
    const instance = createInstance("create");
    const state = { models: [], error: null, loading: false, loadingGeneration: null };
    const x1 = deferred();
    const x2 = deferred();
    const loadX1 = guardedModel(instance, "X", x1.promise, state);
    const loadX2 = guardedModel(instance, "X", x2.promise, state);
    x2.resolve(["X2"]);
    await loadX2;
    x1.resolve(["X1"]);
    await loadX1;
    assert.deepEqual(state.models, ["X2"], "older same-make X1 cannot overwrite X2");
  }

  {
    const instance = createInstance("create");
    const state = { models: [], error: null, loading: false, loadingGeneration: null };
    const x1 = deferred();
    const y = deferred();
    const x2 = deferred();
    const loadX1 = guardedModel(instance, "X", x1.promise, state);
    const loadY = guardedModel(instance, "Y", y.promise, state);
    const loadX2 = guardedModel(instance, "X", x2.promise, state);
    x2.resolve(["X2"]);
    await loadX2;
    y.resolve(["Y"]);
    await loadY;
    x1.resolve(["X1"]);
    await loadX1;
    assert.deepEqual(state.models, ["X2"], "X1 to Y to X2 accepts only X2");
  }

  {
    const instance = createInstance("create");
    const state = { models: [], error: null, loading: false, loadingGeneration: null };
    const x1 = deferred();
    const loadX1 = guardedModel(instance, "X", x1.promise, state);
    clearModels(instance, state);
    x1.resolve(["X1"]);
    await loadX1;
    assert.deepEqual(state.models, [], "X1 resolving after make clear cannot repopulate models");
    assert.equal(state.loading, false, "stale model finally cannot change cleared loading state");
  }

  {
    const instance = createInstance("create");
    const state = { models: [], error: null, loading: false, loadingGeneration: null };
    const x1 = deferred();
    const x2 = deferred();
    const loadX1 = guardedModel(instance, "X", x1.promise, state);
    clearModels(instance, state);
    const loadX2 = guardedModel(instance, "X", x2.promise, state);
    x1.reject(new Error("stale X1"));
    await loadX1;
    assert.equal(state.error, null, "stale model error after clear is ignored");
    assert.equal(state.loading, true, "stale model finally cannot clear X2 loading");
    x2.resolve(["X2"]);
    await loadX2;
    assert.deepEqual(state.models, ["X2"], "X1 to clear to X2 accepts only X2");
    assert.equal(state.loading, false, "current model request clears its own loading state");
  }

  console.log("SELL route-state tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
