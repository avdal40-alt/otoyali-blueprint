const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const inbox = read("src", "app", "profile", "messages", "_components", "InboxClient.tsx");
const thread = read("src", "app", "profile", "messages", "[conversationId]", "_components", "ConversationClient.tsx");

for (const [source, tokens] of [
  [inbox, ["max-w-3xl", "items-center", "gap-3", "unreadCount"]],
  [thread, ["max-w-3xl", "flex-wrap", "max-w-[85%]", "break-words", "aria-live=\"polite\""]],
]) for (const token of tokens) assert.ok(source.includes(token), token);

for (const script of [
  "jlc-0603-messaging-unread-runtime.test.cjs",
  "jlc-0605-chat-notification-runtime.test.cjs",
  "functional-03a1.test.cjs",
  "functional-03a2.test.cjs",
  "functional-03a3.test.cjs",
  "functional-03a4.test.cjs",
  "functional-03a4-ui.test.cjs",
  "functional-03a5.test.cjs",
  "functional-03a6-refresh.test.cjs",
  "functional-03b-d-unified-notifications.test.cjs",
]) execFileSync(process.execPath, [path.join("scripts", script)], { cwd: root, stdio: "pipe" });

console.log("JLC-0606 chat cross-system release gate passed");
