const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const chat = read("src", "app", "profile", "messages", "[conversationId]", "_components", "ConversationClient.tsx");
const en = read("src", "i18n", "dictionaries", "en.ts");
const tr = read("src", "i18n", "dictionaries", "tr.ts");

for (const token of [
  "setSafetyAction(blocked ? \"unblock\" : \"block\")",
  "open={safetyAction !== null}",
  "blockConfirmTitle",
  "unblockConfirmTitle",
  "/api/conversations/${conversationId}/block",
  "setBlocked(isBlock)",
  "disabled={blocked || sending",
  "setBlocked(true)",
  "messages?.map",
  "safetyReminder",
  "reportConversation",
  "reportMessage",
  "reportReasons.map",
  "submitReport",
  "messageId: message.messageId",
  "role=\"status\"",
  "aria-describedby=\"message-count blocked-message\"",
  "<fieldset"
]) assert.ok(chat.includes(token), token);

assert.match(chat, /reportTarget\.kind === "conversation" \? `\/api\/conversations\/\$\{conversationId\}\/report` : `\/api\/conversations\/\$\{conversationId\}\/messages\/\$\{reportTarget\.messageId\}\/report`/);
assert.match(chat, /authenticatedRequest\(path, "POST", \{ reason \}\)/, "report payload contains only the canonical reason");
assert.doesNotMatch(chat, /console\.|localStorage|analytics|phone|vin|reporterId|moderation|queue/i, "chat safety UX must not leak private data or telemetry");
assert.doesNotMatch(chat, /guarantee|guaranteed|garanti/i, "safety copy makes no transaction guarantee");

for (const source of [en, tr]) for (const token of [
  "block:", "unblock:", "reportConversation:", "reportMessage:", "safetyReminder:",
  "blockConfirmTitle:", "reportReason:", "reportSuccess:", "reportReasonFraud:", "reportReasonOther:"
]) assert.ok(source.includes(token), token);

console.log("FUNCTIONAL-03A4 messaging safety UI contract passed");
