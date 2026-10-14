const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const audit = read("docs/jolcar-control/JLC-1501-ARCHITECTURE-DOMAIN-BOUNDARY-AUDIT.md");

for (const domain of ["Accounts", "Listings", "Search", "Dealers", "CRM", "Messaging", "Reviews", "Live", "AI", "Analytics"]) {
  assert.match(audit, new RegExp(`\\| ${domain} \\|`), `${domain} must have an explicit owner and contract boundary`);
}
for (const rule of ["D-049", "service-role client", "RLS/RPC", "standalone API", "microservice"]) {
  assert.match(audit, new RegExp(rule, "i"), `audit must retain ${rule} guardrail`);
}
assert.match(audit, /Search v1 cursor\/`raised_at`\/`published_at`/);
assert.match(audit, /`has_video` projection/);
assert.match(audit, /allow-listed and server-owned/);

const searchService = read("apps/web/src/lib/search/search-service.ts");
assert.match(searchService, /SearchService/);
assert.match(searchService, /search_listings_v1/);
const messaging = read("apps/web/src/lib/messaging/conversation-api.ts");
assert.match(messaging, /requireAuthenticatedRequest/);
assert.match(messaging, /publicRpcErrorStatus/);
const conversations = read("apps/web/src/app/api/conversations/route.ts");
assert.match(conversations, /rateLimit\(authenticated\.userId, "create"\)/);
assert.match(conversations, /get_or_create_listing_conversation/);
const reviews = read("apps/web/src/app/api/reviews/route.ts");
assert.match(reviews, /schema\.safeParse/);
assert.match(reviews, /requireAuthenticatedRequestSupabase/);
const live = read("apps/web/src/features/dealer-live/transport.ts");
assert.match(live, /export interface DealerLiveTransportAdapter/);
assert.match(live, /createLocalFakeDealerLiveTransport/);
const ai = read("apps/web/src/features/ai/tools/registry.ts");
assert.match(ai, /AI_TOOLS/);
assert.match(ai, /tool\.authorize\(actor\)/);

console.log("JLC-1501 architecture and domain-boundary audit passed");
