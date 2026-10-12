const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const priceDropMigration = read("supabase", "migrations", "20261010150001_listing_price_drop_alerts.sql");
const finalLifecycleOwner = read("supabase", "migrations", "20261010250000_listing_raise_to_top.sql");

assert.match(priceDropMigration, /CREATE UNIQUE INDEX notifications_price_drop_dedup_idx/u);
assert.match(priceDropMigration, /ON CONFLICT \(user_id, listing_id, type\)/u);
assert.match(priceDropMigration, /saved\.user_id <> v_seller_id/u);
assert.match(priceDropMigration, /listing_matches_search_v1\(v_saved_search\.search_request, p_listing_id\)/u);
assert.match(priceDropMigration, /NEW\.price_amount < OLD\.price_amount/u);
assert.match(priceDropMigration, /NEW\.status = 'active' AND NEW\.moderation_status = 'active'/u);
assert.doesNotMatch(priceDropMigration, /payment|transaction|escrow/i);

assert.match(finalLifecycleOwner, /UPDATE OF status, moderation_status, price_amount, raised_at/u);
assert.match(finalLifecycleOwner, /NEW\.price_amount < OLD\.price_amount/u);
assert.match(finalLifecycleOwner, /generate_price_drop_alerts_for_listing\(NEW\.id\)/u);

console.log("JLC-0413 price-drop alert contract passed");
