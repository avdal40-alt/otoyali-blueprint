const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "local-seller-contact-visual-fixtures.cjs"), "utf8");
assert.match(source, /LOCAL_SUPABASE_API_URL/);
assert.match(source, /LOCAL_SUPABASE_SERVICE_ROLE_KEY/);
assert.match(source, /LOCAL_TEST_EMAIL/);
assert.match(source, /LOCAL_TEST_PHONE/);
assert.match(source, /requireLocalUrl\(apiUrl/);
assert.match(source, /local-\[a-z0-9-\]\+@example/);
assert.match(source, /create_own_listing_draft_v2/);
assert.match(source, /create_own_private_listing_draft/);
assert.match(source, /setZeroContacts\(user\.id, false\)/);
assert.match(source, /sync_own_verified_account_phone/);
assert.match(source, /list_own_verified_seller_contact_phones/);
assert.match(source, /--cleanup/);
assert.match(source, /DELETE FROM vehicle\.vehicle_profiles/);
assert.doesNotMatch(source, /54321|55421|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|access_token|refresh_token|TWILIO_/);

console.log("local-seller-contact-visual-fixtures: PASS");
