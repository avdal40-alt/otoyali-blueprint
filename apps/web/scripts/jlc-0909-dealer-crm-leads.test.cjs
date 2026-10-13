const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013110000_jlc0909_dealer_crm_lead_domain.sql"), "utf8");
for (const token of [
  "CREATE TYPE marketplace.dealer_lead_source",
  "'listing',", "'chat',", "'contact',", "'buyer_request',", "'dealer_post',", "'dealer_live'",
  "dealer_leads_source_dedup_idx", "CREATE TRIGGER dealer_leads_validate_references",
  "CREATE FUNCTION marketplace.create_dealer_lead", "SECURITY DEFINER",
  "dealer_leads_select_dealer_team", "staff may only assign themselves"
]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "staff", "outsider", "buyer", "buyerRequest", "unmatchedBuyerRequest", "make", "model", "vehicle", "listing", "conversation", "disclosure"].map((key) => [key, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO anon, authenticated;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.staff}','authenticated','authenticated','staff-${ids.staff}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO marketplace.dealer_staff_memberships(dealer_id,user_id,role) VALUES ('${ids.dealer}','${ids.staff}','staff');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','JLC 0909 Make','jlc-0909-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','JLC 0909 Model','jlc-0909-${ids.model}');
INSERT INTO marketplace.buyer_requests(id,user_id,title,search_request,status) VALUES ('${ids.buyerRequest}','${ids.buyer}','JLC 0909 request','{"version":"v1","filters":{"model_ids":["${ids.model}"]}}','active');
INSERT INTO marketplace.buyer_requests(id,user_id,title,search_request,status) VALUES ('${ids.unmatchedBuyerRequest}','${ids.buyer}','JLC 0909 unmatched request','{"version":"v1","filters":{"model_ids":["${randomUUID()}"]}}','active');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.dealer}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','JLC 0909 fixture',1,'KZT',false,'Almaty','dealer');
INSERT INTO messaging.conversations(id,listing_id,buyer_id,seller_id) VALUES ('${ids.conversation}','${ids.listing}','${ids.buyer}','${ids.dealer}');
INSERT INTO identity.listing_seller_contact_disclosures(id,buyer_id,listing_id) VALUES ('${ids.disclosure}','${ids.buyer}','${ids.listing}');
${role("authenticated", ids.dealer)}
SELECT (marketplace.create_dealer_lead('${ids.dealer}','listing','${ids.listing}','${ids.listing}','${ids.vehicle}',NULL,'${ids.dealer}')).id INTO TEMP TABLE lead;
INSERT INTO results VALUES ('owner creates listing lead with dealer links',(SELECT count(*)=1 FROM lead));
INSERT INTO results VALUES ('listing retry deterministically returns original',(SELECT (marketplace.create_dealer_lead('${ids.dealer}','listing','${ids.listing}','${ids.listing}','${ids.vehicle}',NULL,'${ids.dealer}')).id = (SELECT id FROM lead)));
SELECT (marketplace.create_dealer_lead('${ids.dealer}','chat','${ids.conversation}','${ids.listing}','${ids.vehicle}',NULL,NULL)).id INTO TEMP TABLE chat_lead;
SELECT (marketplace.create_dealer_lead('${ids.dealer}','contact','${ids.disclosure}','${ids.listing}','${ids.vehicle}',NULL,NULL)).id INTO TEMP TABLE contact_lead;
SELECT (marketplace.create_dealer_lead('${ids.dealer}','buyer_request','${ids.buyerRequest}','${ids.listing}','${ids.vehicle}','${ids.buyerRequest}',NULL)).id INTO TEMP TABLE buyer_request_lead;
INSERT INTO results VALUES ('chat, contact, and matched buyer-request sources are accepted',(SELECT count(*)=1 FROM chat_lead) AND (SELECT count(*)=1 FROM contact_lead) AND (SELECT count(*)=1 FROM buyer_request_lead));
DO $$ BEGIN BEGIN PERFORM marketplace.create_dealer_lead('${ids.dealer}','buyer_request','${ids.unmatchedBuyerRequest}','${ids.listing}','${ids.vehicle}','${ids.unmatchedBuyerRequest}',NULL); INSERT INTO results VALUES ('unmatched buyer-request source denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('unmatched buyer-request source denied',true); END; END $$;
${role("authenticated", ids.staff)}
DO $$ BEGIN BEGIN PERFORM marketplace.create_dealer_lead('${ids.dealer}','chat','${randomUUID()}','${ids.listing}','${ids.vehicle}',NULL,'${ids.staff}'); INSERT INTO results VALUES ('invalid chat source denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('invalid chat source denied',true); END; END $$;
SELECT count(*) INTO TEMP TABLE visible_to_staff FROM marketplace.dealer_leads WHERE dealer_id='${ids.dealer}';
INSERT INTO results VALUES ('staff reads own dealer leads',(SELECT count=4 FROM visible_to_staff));
${role("authenticated", ids.outsider)}
DO $$ BEGIN BEGIN PERFORM marketplace.create_dealer_lead('${ids.dealer}','listing','${ids.listing}','${ids.listing}','${ids.vehicle}',NULL,NULL); INSERT INTO results VALUES ('outsider create denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('outsider create denied',true); END; END $$;
INSERT INTO results VALUES ('outsider cannot read dealer leads',(SELECT count(*)=0 FROM marketplace.dealer_leads WHERE dealer_id='${ids.dealer}'));
${role("anon")}
DO $$ BEGIN BEGIN PERFORM marketplace.create_dealer_lead('${ids.dealer}','listing','${ids.listing}','${ids.listing}','${ids.vehicle}',NULL,NULL); INSERT INTO results VALUES ('anon create denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon create denied',true); END; END $$;
RESET ROLE;
INSERT INTO results VALUES ('private table has no direct api access',NOT has_table_privilege('anon','marketplace.dealer_leads','SELECT') AND NOT has_table_privilege('authenticated','marketplace.dealer_leads','INSERT'));
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0909 dealer CRM lead domain/security matrix passed (${rows.length} checks)`);
