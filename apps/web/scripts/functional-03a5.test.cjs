const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "..", "..");
const web = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(web, ...parts), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260921063719_functional_03a5_conversation_send_state.sql"), "utf8");
const blockRoute = read("src", "app", "api", "conversations", "[id]", "block", "route.ts");
const chat = read("src", "app", "profile", "messages", "[conversationId]", "_components", "ConversationClient.tsx");
const start = read("src", "app", "listing", "[id]", "_components", "StartConversationButton.tsx");
const messages = read("src", "app", "api", "conversations", "[id]", "messages", "route.ts");
const inbox = read("src", "app", "profile", "messages", "_components", "InboxClient.tsx");

for (const token of ["get_conversation_send_state", "auth.uid()", "conversation_participants", "block.unblocked_at IS NULL", "REVOKE ALL ON FUNCTION", "GRANT EXECUTE ON FUNCTION public.get_conversation_send_state(UUID) TO authenticated"]) assert.ok(migration.includes(token), token);
for (const source of [blockRoute, messages]) { assert.match(source, /privateResponseHeaders/); assert.doesNotMatch(source, /console\.|phone|vin|service_role|SUPABASE_SERVICE/i); }
for (const token of ["rpc(\"get_conversation_send_state\"", "data: { blocked: row.is_blocked }", "block_conversation_participant", "unblock_conversation_participant"]) assert.ok(blockRoute.includes(token), token);
for (const token of ["/api/conversations/${conversationId}/block", "setBlocked(statePayload.data!.blocked!)", "disabled={blocked || sending", "reportTarget.messageId", "authenticatedRequest(path, \"POST\", { reason })", "safetyReminder"]) assert.ok(chat.includes(token), token);
for (const source of [chat, inbox, start]) assert.doesNotMatch(source, /whatsapp|analytics|localStorage/i);
assert.ok(start.includes('localizePath("/login", locale)'), "guest chat CTA preserves a localized auth return");
assert.ok(messages.includes('parseCursor(request.nextUrl.searchParams, 100)'), "message history remains bounded");

execFileSync(process.execPath, ["scripts/functional-03a1.test.cjs"], { cwd: web, stdio: "pipe" });
execFileSync(process.execPath, ["scripts/functional-03a4.test.cjs"], { cwd: web, stdio: "pipe" });
console.log("FUNCTIONAL-03A5 conversation completion regression passed");
