const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const priceMigration = read("..", "..", "supabase", "migrations", "20261010150001_listing_price_drop_alerts.sql");
const extensibilityMigration = read("..", "..", "supabase", "migrations", "20261010233000_jlc_0414_notification_center_extensible_types.sql");
const client = read("src", "app", "notifications", "_components", "NotificationsClient.tsx");
const api = read("src", "app", "api", "notifications", "route.ts");
const en = read("src", "i18n", "dictionaries", "en.ts");
const tr = read("src", "i18n", "dictionaries", "tr.ts");

assert.match(priceMigration, /CHECK \(type IN \('saved_search_match', 'price_drop'\)\)/u);
assert.match(priceMigration, /generate_price_drop_alerts_for_listing/u);
assert.match(priceMigration, /VALUES \(v_saved_search\.user_id, 'price_drop'/u);
assert.match(priceMigration, /notifications_price_drop_dedup_idx/u);

assert.match(extensibilityMigration, /DROP CONSTRAINT notifications_type_check/u);
assert.match(extensibilityMigration, /CHECK \(type ~ '\^\[a-z\]\[a-z0-9_\]\{1,63\}\$'\)/u);
assert.doesNotMatch(extensibilityMigration, /chat_message|dealer_live_started/u);

assert.match(client, /type NotificationRow = \{ id: string; type: string;/u);
assert.match(client, /row\.type === "price_drop" \? copy\.priceDrop/u);
assert.match(client, /row\.type === "saved_search_match" \? copy\.newMatch/u);
assert.match(client, /copy\.notificationUpdate/u);
assert.match(client, /localizePath\(`\/listing\/\$\{row\.listingId\}`/u);
assert.doesNotMatch(client, /\.from\(["']notifications/u);

assert.match(api, /list_own_notifications/u);
assert.match(api, /privateJson/u);
assert.doesNotMatch(api, /\.from\(["']notifications/u);

for (const [label, dictionary] of [["en", en], ["tr", tr]]) {
  assert.match(dictionary, /newMatch:/u, `${label}: saved-search label`);
  assert.match(dictionary, /priceDrop:/u, `${label}: price-drop label`);
  assert.match(dictionary, /notificationUpdate:/u, `${label}: future event fallback`);
}

console.log("FUNCTIONAL-03B-D unified notification center contract passed");
