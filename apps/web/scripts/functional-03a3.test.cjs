const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const cta = read("src", "app", "listing", "[id]", "_components", "StartConversationButton.tsx");
const inbox = read("src", "app", "profile", "messages", "_components", "InboxClient.tsx");
const chat = read("src", "app", "profile", "messages", "[conversationId]", "_components", "ConversationClient.tsx");
const page = read("src", "app", "listing", "[id]", "page.tsx");

for (const value of [cta, inbox, chat]) {
  assert.doesNotMatch(value, /\.rpc\(|\.from\("(?:messages|conversations)"|console\./i);
}

for (const token of [
  "/api/conversations",
  "Authorization: `Bearer ${data.session.access_token}`",
  'localizePath("/login", locale)',
  "body: JSON.stringify({ listingId })"
]) {
  assert.ok(cta.includes(token), token);
}

assert.doesNotMatch(cta, /sellerId|seller_id|data\.session\.user\.id/i, "the public listing CTA must not receive seller identity; the RPC enforces self-contact denial");

for (const token of ["/api/conversations?limit=20", "emptyTitle", "unreadCount", "no-store"]) {
  assert.ok(inbox.includes(token), token);
}

for (const token of ["/messages${query}", "/read", "whitespace-pre-wrap", "maxLength={4000}", "sending"]) {
  assert.ok(chat.includes(token), token);
}
assert.match(chat, /Array\.from\(text\)\.length\s*>\s*2000/, "the client enforces the canonical message-length limit");

assert.match(page, /StartConversationButton/);
assert.doesNotMatch([cta, inbox, chat].join("\n"), /phone|vin|whatsapp|analytics|localStorage/i);
console.log("FUNCTIONAL-03A3 inbox and conversation UX contract passed");
