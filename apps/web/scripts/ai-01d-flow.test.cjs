const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const root = path.resolve(__dirname, "..");
const runtime = fs.readFileSync(path.join(root, "src", "features", "ai", "sell", "sell-runtime.ts"), "utf8"); const ui = fs.readFileSync(path.join(root, "src", "app", "sell", "_components", "SellAssistant.tsx"), "utf8");
for (const action of ["turn", "confirm_create", "confirm_update", "confirm_submit", "generate_description", "apply_description"]) assert.match(runtime, new RegExp(`action === "${action}"|"${action}"`));
assert.match(runtime, /createListingSchema\.safeParse/); assert.match(runtime, /editListingSchema\.safeParse/); assert.match(runtime, /createOwnListingDraft/); assert.match(runtime, /saveOwnRejectedListing/); assert.match(runtime, /submitOwnListing/);
assert.match(ui, /fetch\("\/api\/ai\/sell"/); assert.doesNotMatch(ui, /\/api\/listings|\.rpc\(|\.from\(/);
console.log("AI-01D deterministic end-to-end UI/runtime flow contract passed");
