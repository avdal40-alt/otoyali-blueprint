const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261010150000_seller_analytics_event_model.sql"), "utf8");

for (const event of ["view", "contact_intent", "favorite", "message"]) assert.match(migration, new RegExp(`'${event}'`));
assert.match(migration, /record_seller_analytics_event\(\s*p_listing_id UUID,\s*p_event_type TEXT,\s*p_event_key UUID/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /ON CONFLICT \(listing_id, event_type, event_key, event_hour\) DO NOTHING/);
assert.match(migration, /no buyer identity, contact data, message body, IP, or user agent/i);
assert.match(migration, /REVOKE ALL ON TABLE marketplace\.seller_analytics_events FROM PUBLIC, anon, authenticated, service_role/);
assert.match(migration, /p_event_type <> 'view' AND v_user_id IS NULL/);
assert.match(migration, /listing_favorites/);
assert.match(migration, /messaging\.conversations/);
assert.doesNotMatch(migration, /buyer_id\s+UUID|seller_id\s+UUID|message_body|phone|ip_address|user_agent/);
console.log("seller analytics event contract: PASS");
