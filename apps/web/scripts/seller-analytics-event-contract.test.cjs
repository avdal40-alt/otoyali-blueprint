const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261010150002_seller_analytics_event_model.sql"), "utf8");
const ingestionMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261010240000_seller_analytics_ingestion.sql"), "utf8");

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
for (const source of ["listing_view", "contact_disclosure", "favorite", "message"]) {
  assert.match(ingestionMigration, new RegExp(`CREATE TRIGGER seller_analytics_from_${source}`));
}
assert.match(ingestionMigration, /NEW\.viewer_key/);
assert.match(ingestionMigration, /NEW\.id/);
assert.match(ingestionMigration, /listing\.seller_id <> NEW\.user_id/);
assert.match(ingestionMigration, /NEW\.sender_id = conversation\.buyer_id/);
assert.match(ingestionMigration, /listing\.seller_id = conversation\.seller_id/);
assert.match(ingestionMigration, /ON CONFLICT \(listing_id, event_type, event_key, event_hour\) DO NOTHING/);
assert.match(ingestionMigration, /REVOKE ALL ON FUNCTION marketplace\.ingest_seller_analytics_from_message\(\) FROM PUBLIC, anon, authenticated, service_role/);
assert.doesNotMatch(ingestionMigration, /NEW\.(?:body|phone|email|ip|user_agent)|raw_payload|provider_reference|auth_token/i);
console.log("seller analytics event contract: PASS");
