const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const chat = read("src", "app", "profile", "messages", "[conversationId]", "_components", "ConversationClient.tsx");
const inbox = read("src", "app", "profile", "messages", "_components", "InboxClient.tsx");

for (const [label, source] of [["conversation", chat], ["inbox", inbox]]) {
  assert.match(source, /window\.setInterval\(refresh,/u, `${label} must poll while open`);
  assert.match(source, /document\.visibilityState\s*===\s*"visible"/u, `${label} polling must pause while hidden`);
  assert.match(source, /window\.addEventListener\("focus",\s*refresh\)/u, `${label} must refresh on focus`);
  assert.match(source, /document\.addEventListener\("visibilitychange",\s*refresh\)/u, `${label} must refresh after visibility changes`);
  assert.match(source, /window\.clearInterval\(timer\)/u, `${label} interval must be cleaned up`);
  assert.match(source, /window\.removeEventListener\("focus",\s*refresh\)/u, `${label} focus listener must be cleaned up`);
  assert.match(source, /document\.removeEventListener\("visibilitychange",\s*refresh\)/u, `${label} visibility listener must be cleaned up`);
  assert.match(source, /cache:\s*"no-store"/u, `${label} refresh must not reuse stale HTTP cache`);
}

assert.match(chat, /window\.setInterval\(refresh,\s*5_000\)/u, "open conversation polls every five seconds");
assert.match(inbox, /window\.setInterval\(refresh,\s*10_000\)/u, "inbox polls every ten seconds");
assert.match(chat, /await load\(\)/u, "successful send refreshes authoritative conversation state");
assert.doesNotMatch(chat + "\n" + inbox, /\.from\(["'](?:messages|conversations)["']/iu, "browser clients must not bypass owner-scoped conversation APIs");
assert.doesNotMatch(chat + "\n" + inbox, /service_role|SUPABASE_SERVICE/i, "browser clients must not expose service credentials");

console.log("FUNCTIONAL-03A6 reliable chat polling and refresh contract passed");
