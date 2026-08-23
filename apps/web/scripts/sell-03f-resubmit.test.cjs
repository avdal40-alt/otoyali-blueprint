const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const migration = read(repoRoot, "supabase", "migrations", "20260724120000_sell03_rejected_listing_editing.sql");
const wizard = read(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const listings = read(projectRoot, "src", "app", "profile", "listings", "_components", "MyListingsClient.tsx");

const rpcName = "resubmit_own_listing_for_review";
const resubmitStart = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${rpcName}(p_listing_id UUID)`);
const resubmitEnd = migration.indexOf("$$;", resubmitStart) + 3;
const resubmitSql = migration.slice(resubmitStart, resubmitEnd);

assert.ok(resubmitStart >= 0, "The focused test must read the real resubmit SQL definition");
assert.ok(resubmitSql.includes("RETURNS TABLE (\n  listing_id UUID,\n  status TEXT,\n  moderation_status TEXT\n)"));
assert.ok(resubmitSql.includes("RETURN QUERY SELECT p_listing_id, v_new_status::TEXT, v_new_moderation_status;"));
assert.ok(resubmitSql.includes("SECURITY DEFINER\nSET search_path = public, pg_catalog"));
assert.ok(resubmitSql.includes("v_ownership.owner_id <> v_user_id"));
assert.ok(resubmitSql.includes("v_listing.moderation_status <> 'rejected'"));

const rpcCallPattern = new RegExp(`rpc\\([\\s\\S]*?[\"']${rpcName}[\"']`, "g");
assert.equal((wizard.match(rpcCallPattern) ?? []).length, 1, "Sell edit has one resubmit callsite");
assert.equal(listings.includes(`resubmit: "${rpcName}"`), true, "My Listings maps resubmit to the hardened RPC");
assert.equal((`${wizard}\n${listings}`.match(new RegExp(rpcName, "g")) ?? []).length, 2, "Every frontend resubmit callsite is audited");

assert.ok(wizard.includes('({ error: resubmitError } = await supabase.rpc("resubmit_own_listing_for_review"'));
assert.ok(wizard.includes("if (resubmitError)"), "Sell edit preserves genuine RPC failures");
assert.ok(wizard.includes("catch (resubmitRequestError)"), "Sell edit handles thrown transport failures");
assert.ok(wizard.includes("setError(editErrorMessage(null, sell03, true));"), "Thrown transport details are sanitized");
assert.ok(!wizard.includes("resubmitRows"), "Sell edit cannot infer failure from an absent payload");
assert.ok(!wizard.includes("const resubmitted ="), "Sell edit cannot infer failure from an assumed row shape");
assert.ok(wizard.indexOf("if (resubmitError)") < wizard.indexOf('setEditSaved("pending_review")'));

assert.ok(listings.includes("if (actionInFlight.current !== null) return;"), "A synchronous in-flight guard prevents duplicate resubmits");
assert.ok(listings.includes("actionInFlight.current = listingId;"));
assert.ok(listings.includes("if (actionInFlight.current === listingId)"), "Completion is tied to the stable listing UUID");
assert.ok(listings.includes("resolveListingWorkflow("), "Production uses the directly tested outcome helper");
assert.ok(listings.includes('outcome.kind === "mutation-failed"'), "Only mutation failures use lifecycle failure UX");
assert.ok(listings.includes('outcome.kind === "mutation-succeeded-refresh-failed"'), "Exceptional refresh failures have separate ownership");
assert.ok(listings.includes("setError(listingLoadErrorMessage(locale))"), "Refresh errors use sanitized load failure UX");
assert.ok(listings.includes("finally {"), "Controls are restored after every completion path");
assert.ok(listings.includes("const mounted = useRef(false);"), "Component instance tracks mounted state");
assert.ok(listings.includes("const listingLoadGeneration = useRef(0);"), "Superseded listing loads cannot commit stale state");
assert.ok(listings.includes("if (!isCurrentLoad()) return;"), "Async load continuations verify current ownership");
assert.ok(listings.includes("mounted.current = false;"), "Unmount invalidates the component instance");
assert.ok(listings.includes("<article key={item.id}"), "Cards use stable listing UUID identity");
assert.ok(!listings.includes("workflowError.message"), "Raw RPC messages are not rendered");
assert.ok(!listings.includes("JSON.stringify(workflowError)"), "Raw RPC results are not rendered");

function loadProductionOutcomeHelper() {
  const sourceFile = ts.createSourceFile("MyListingsClient.tsx", listings, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = sourceFile.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "resolveListingWorkflow"
  );
  assert.ok(declaration, "The production outcome helper must exist");

  const helperSource = declaration.getText(sourceFile).replace(/^export\s+/, "");
  const compiled = ts.transpileModule(`${helperSource}\nmodule.exports = resolveListingWorkflow;`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const helperModule = { exports: {} };
  Function("module", "exports", compiled)(helperModule, helperModule.exports);
  return helperModule.exports;
}

async function testProductionOutcomeContract() {
  const resolveListingWorkflow = loadProductionOutcomeHelper();

  for (const data of [
    [{ listing_id: "listing-a", status: "draft", moderation_status: "pending_review" }],
    null,
    []
  ]) {
    let refreshCount = 0;
    const outcome = await resolveListingWorkflow(
      async () => ({ data, error: null }),
      async () => { refreshCount += 1; }
    );
    assert.deepEqual(outcome, { kind: "mutation-succeeded" }, "No-error RPC completion is authoritative success");
    assert.equal(refreshCount, 1, "Every successful mutation attempts one authoritative refresh");
  }

  for (const mutationError of [
    { code: "OT401", message: "authentication required" },
    { code: "OT404", message: "listing not found" },
    { code: "OT409", message: "listing lifecycle changed" },
    { message: "network failure" }
  ]) {
    let refreshCount = 0;
    const outcome = await resolveListingWorkflow(
      async () => ({ data: null, error: mutationError }),
      async () => { refreshCount += 1; }
    );
    assert.equal(outcome.kind, "mutation-failed");
    assert.equal(outcome.error, mutationError);
    assert.equal(refreshCount, 0, "Returned RPC errors never trigger refresh");
  }

  const thrownMutationError = new Error("mutation transport rejected");
  let refreshAfterThrownMutation = 0;
  const thrownMutationOutcome = await resolveListingWorkflow(
    async () => { throw thrownMutationError; },
    async () => { refreshAfterThrownMutation += 1; }
  );
  assert.equal(thrownMutationOutcome.kind, "mutation-failed");
  assert.equal(thrownMutationOutcome.error, thrownMutationError);
  assert.equal(refreshAfterThrownMutation, 0, "Thrown mutation failures never trigger refresh");

  let normalRefreshFailureVisible = false;
  const returnedRefreshErrorOutcome = await resolveListingWorkflow(
    async () => ({ data: null, error: null }),
    async () => { normalRefreshFailureVisible = true; }
  );
  assert.deepEqual(returnedRefreshErrorOutcome, { kind: "mutation-succeeded" });
  assert.equal(normalRefreshFailureVisible, true, "Returned query errors remain owned by loadListings UI state");

  const refreshError = new Error("refresh transport rejected");
  const thrownRefreshOutcome = await resolveListingWorkflow(
    async () => ({ data: null, error: null }),
    async () => { throw refreshError; }
  );
  assert.equal(thrownRefreshOutcome.kind, "mutation-succeeded-refresh-failed", "RPC success plus refresh throw cannot become mutation failure");
  assert.equal(thrownRefreshOutcome.error, refreshError);

  let inFlightListingId = null;
  let mutationCount = 0;
  let mutatedListingId = null;
  let releaseRefresh;
  const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
  const invoke = (listingId) => {
    if (inFlightListingId !== null) return Promise.resolve("guarded");
    inFlightListingId = listingId;
    return resolveListingWorkflow(
      async () => {
        mutationCount += 1;
        mutatedListingId = listingId;
        return { data: null, error: null };
      },
      async () => refreshGate
    ).finally(() => {
      if (inFlightListingId === listingId) inFlightListingId = null;
    });
  };
  const firstAction = invoke("listing-stable-uuid");
  const duplicateAction = await invoke("listing-stable-uuid");
  assert.equal(duplicateAction, "guarded");
  assert.equal(mutationCount, 1, "Rapid duplicate action issues one mutation");
  assert.equal(mutatedListingId, "listing-stable-uuid", "The stable listing UUID is the mutation identity");
  assert.equal(inFlightListingId, "listing-stable-uuid", "Guard remains held through refresh");
  releaseRefresh();
  await firstAction;
  assert.equal(inFlightListingId, null, "One final release restores controls after refresh completion");
}

testProductionOutcomeContract()
  .then(() => console.log("SELL-03F My Listings resubmit regression tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
