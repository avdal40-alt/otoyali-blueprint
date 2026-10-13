const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assistant = read("src", "app", "sell", "_components", "SellAssistant.tsx");
const wizard = read("src", "app", "sell", "_components", "SellWizard.tsx");
const runtime = read("src", "features", "ai", "sell", "sell-runtime.ts");
const route = read("src", "app", "api", "ai", "sell", "route.ts");

assert.match(assistant, /action: "turn"/, "assistant only requests a typed conversational turn");
assert.match(assistant, /onApply\(state\.draft\)/, "owner explicitly applies suggested fields to the form");
assert.doesNotMatch(assistant, /confirm_create|confirm_update|confirm_submit|\/api\/listings/, "assistant cannot save, submit, or call listing writes directly");
assert.match(wizard, /<SellAssistant/, "canonical listing wizard renders the assistant");
assert.match(wizard, /function applyAssistantDraft/, "wizard owns mapping suggestions into form state");
assert.match(wizard, /update\(field, String\(value\)\)/, "suggested scalar values are applied through the canonical form updater");
assert.match(runtime, /getMissingRequiredFields\(draft\)/, "runtime identifies the next missing canonical field");
assert.match(runtime, /createListingSchema\.safeParse\(draft\)/, "any assistant-initiated create remains subject to canonical validation");
assert.match(route, /requireAuthenticatedRequestSupabase/, "assistant API requires an authenticated request");

console.log("JLC-1006 listing form orchestration contract passed");
