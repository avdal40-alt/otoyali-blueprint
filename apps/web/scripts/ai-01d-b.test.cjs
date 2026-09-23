const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const runtime = read("src", "features", "ai", "sell", "sell-runtime.ts"); const route = read("src", "app", "api", "ai", "sell", "route.ts"); const writes = read("src", "lib", "listings", "server-write.ts");
for (const value of ["sellAssistantRequestSchema", "runSellAssistant", "extractDeterministicPatch", "generateDescription", "confirm_create", "confirm_update", "confirm_submit", "generate_description", "discard_description", "apply_description", "createOwnListingDraft", "saveOwnRejectedListing", "submitOwnListing", "get_own_rejected_listing_for_edit", "extractSellerDeclarations", "isSafeDescription"]) assert.match(runtime, new RegExp(value));
assert.match(route, /requireAuthenticatedRequestSupabase/); assert.match(route, /privateApiHeaders/); assert.match(route, /runSellAssistant/);
for (const value of ["createOwnListingDraft", "saveOwnRejectedListing", "submitOwnListing"]) assert.match(writes, new RegExp(`export async function ${value}`));
assert.doesNotMatch(runtime, /\.from\(|\.insert\(|\.update\(|service_role|ownerId|sellerId|verified.?galeri|admin RPC/i);
console.log("AI-01D-B authenticated sell runtime contract passed");
