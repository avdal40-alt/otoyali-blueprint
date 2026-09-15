const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const conversations = read("src", "app", "api", "conversations", "route.ts");
const messages = read("src", "app", "api", "conversations", "[id]", "messages", "route.ts");
const readState = read("src", "app", "api", "conversations", "[id]", "read", "route.ts");
const helper = read("src", "lib", "messaging", "conversation-api.ts");
const routes = [conversations, messages, readState].join("\n");

for (const source of [conversations, messages, readState]) {
  assert.match(source, /requireAuthenticatedRequest\(request\.headers\.get\("authorization"\)\)/, "every private route verifies bearer identity");
  assert.match(source, /privateResponseHeaders/, "every private route is no-store");
  assert.doesNotMatch(source, /console\.(?:log|warn|error)/, "routes never log message data");
}
for (const token of [
  'rpc("get_or_create_listing_conversation", { p_listing_id: listingId })',
  'rpc("list_own_conversations"',
  'rpc("list_conversation_messages"',
  'rpc("send_conversation_message", { p_conversation_id: id, p_body: text })',
  'rpc("mark_conversation_read", { p_conversation_id: id, p_message_id: messageId })',
  'parseCursor(request.nextUrl.searchParams, 50)',
  'parseCursor(request.nextUrl.searchParams, 100)',
  'rateLimit(authenticated.userId, "create")',
  'rateLimit(authenticated.userId, "send")'
]) assert.ok(routes.includes(token), token);
assert.doesNotMatch(routes, /sellerId|buyerId|profileId|dealerId|service_role|SUPABASE_SERVICE/i, "browser cannot control participant identity or elevate privileges");
assert.doesNotMatch(routes, /phone|vin|moderation|audit/i, "private API does not expose unrelated sensitive fields");
for (const token of ["Cache-Control\": \"private, no-store, max-age=0", "Vary: \"Authorization\"", "Object.keys(record).length !== 1", "Array.from(record.text).length > 2000", "beforeAt", "beforeId", "publicRpcErrorStatus", "Do not distinguish a missing conversation"]) assert.ok(helper.includes(token), token);

// The server boundary delegates authorization to the immutable 03A1 RPC contract.
// This executes the local rollback-only anonymous/buyer/seller/cross-user/self-contact matrix.
execFileSync(process.execPath, ["scripts/functional-03a1.test.cjs"], { cwd: root, stdio: "pipe" });
console.log("FUNCTIONAL-03A2 conversation server API contract passed");
