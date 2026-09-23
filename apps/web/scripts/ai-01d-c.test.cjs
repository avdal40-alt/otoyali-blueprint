const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8"); const page = read("src", "app", "sell", "page.tsx"); const ui = read("src", "app", "sell", "_components", "SellAssistant.tsx");
assert.match(page, /SellAssistant/); assert.match(page, /SellWizard/);
for (const token of ["/api/ai/sell", "confirm_create", "confirm_update", "confirm_submit", "generate_description", "regenerate_description", "discard_description", "apply_description", "aria-live", "onKeyDown", "maxLength={2000}", "readyForReview", "descriptionPreview"]) assert.match(ui, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(ui, /\.from\(|\.insert\(|\.update\(|\.rpc\(|service_role|ownerId|sellerId|moderation_status/i);
console.log("AI-01D-C Sell Assistant UI integration contract passed");
