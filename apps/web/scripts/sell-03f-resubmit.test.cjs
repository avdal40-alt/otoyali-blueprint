const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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

// A mutation's API error is authoritative. A response-body representation is not
// a second success signal, even when PostgREST omits or changes that representation.
const mutationSucceeded = ({ error }) => error == null;
for (const data of [
  [{ listing_id: "listing-a", status: "draft", moderation_status: "pending_review" }],
  null,
  []
]) {
  assert.equal(mutationSucceeded({ data, error: null, status: data === null ? 204 : 200 }), true);
}
for (const error of [
  { code: "OT401", message: "authentication required" },
  { code: "OT404", message: "listing not found" },
  { code: "OT409", message: "listing lifecycle changed" },
  { message: "network failure" }
]) {
  assert.equal(mutationSucceeded({ data: null, error, status: 400 }), false);
}

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
assert.ok(listings.includes("await loadListings();"), "Success reloads authoritative server state");
assert.ok(listings.includes("catch (workflowError)"), "Thrown transport failures use safe failure UX");
assert.ok(listings.includes("setError(lifecycleErrorMessage(null, locale));"), "Thrown errors are sanitized");
assert.ok(listings.includes("finally {"), "Controls are restored after every completion path");
assert.ok(listings.includes("<article key={item.id}"), "Cards use stable listing UUID identity");
assert.ok(!listings.includes("workflowError.message"), "Raw RPC messages are not rendered");
assert.ok(!listings.includes("JSON.stringify(workflowError)"), "Raw RPC results are not rendered");

console.log("SELL-03F My Listings resubmit regression tests passed");
