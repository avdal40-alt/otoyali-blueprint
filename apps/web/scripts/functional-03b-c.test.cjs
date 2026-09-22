const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, "apps", "web", ...parts), "utf8");
const header = read("src", "components", "layout", "AppHeader.tsx");
const notifications = read("src", "app", "notifications", "_components", "NotificationsClient.tsx");
const saved = read("src", "app", "profile", "saved-searches", "_components", "SavedSearchesClient.tsx");
const profile = read("src", "app", "profile", "_components", "ProfileClient.tsx");
const tr = read("src", "i18n", "dictionaries", "tr.ts");
const en = read("src", "i18n", "dictionaries", "en.ts");

assert.match(header, /api\/notifications\/unread-count/);
assert.match(header, /unreadCount > 0/);
assert.match(header, /login.*next=/i);
for (const token of ["/api/notifications?", "/api/notifications/${id}/read", "/api/notifications/read-all", "newMatch", "loadMore", "markAll", "localizePath(`/listing/${row.listingId}`"]) assert.ok(notifications.includes(token), token);
for (const token of ["/api/saved-searches", "method: \"PATCH\"", "method: \"DELETE\"", "criteriaVersion !== \"v1\"", "alertsUnavailable", "type=\"checkbox\""]) assert.ok(saved.includes(token), token);
assert.match(profile, /profile\/saved-searches/);
for (const source of [notifications, saved]) {
  assert.match(source, /getSupabaseBrowserClient\(\)\.auth\.getSession/);
  assert.doesNotMatch(source, /\.from\(["']notifications|\.from\(["']saved_searches|localStorage|sessionStorage|phone|vin|moderation|report/i);
}
for (const source of [tr, en]) for (const key of ["notifications:", "newMatch", "markAll", "savedSearches", "alertsEnabled", "alertsDisabled", "legacy"]) assert.ok(source.includes(key), key);
console.log("FUNCTIONAL-03B-C notification UI and saved-search management contract passed");
