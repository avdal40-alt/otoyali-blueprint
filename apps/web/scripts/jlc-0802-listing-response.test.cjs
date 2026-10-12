const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261010170000_buyer_request_listing_response.sql"), "utf8");
const route = fs.readFileSync(path.join(root, "apps", "web", "src", "app", "api", "conversations", "[id]", "messages", "route.ts"), "utf8");
const client = fs.readFileSync(path.join(root, "apps", "web", "src", "app", "profile", "messages", "[conversationId]", "_components", "ConversationClient.tsx"), "utf8");
for (const token of ["conversation_listing_responses", "l.seller_id = v_user_id", "l.status = 'active'", "l.moderation_status = 'active'", "REVOKE ALL ON messaging.conversation_listing_responses", "SECURITY DEFINER SET search_path = ''"]) assert.ok(migration.includes(token), token);
for (const token of ["attach_own_active_listing_response", "list_conversation_listing_responses", "responses: responses.data ?? []"]) assert.ok(route.includes(token), token);
for (const token of ["type ListingResponse", "setResponses(payload.responses)", "responses.length > 0", "copy.listingResponses", "copy.viewListingResponse", "localizePath(`/listing/${response.listing_id}`, locale)"]) assert.ok(client.includes(token), token);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "other", "otherSeller", "make", "model", "vehicleA", "vehicleB", "vehicleC", "listingA", "listingB", "listingC"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const vehicle = (id, owner) => `INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES('${id}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${owner}'); INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES('${id}','${owner}','owner',true);`;
const listing = (id, vehicleId, seller, title) => `INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES('${id}','${vehicleId}','${seller}','active','active','${title}',1,'KZT',false,'Almaty','private');`;
const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO anon, authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','other-${ids.other}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.otherSeller}','authenticated','authenticated','other-seller-${ids.otherSeller}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','Response Make','response-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','Response Model','response-${ids.model}');
  ${vehicle(ids.vehicleA, ids.seller)} ${vehicle(ids.vehicleB, ids.seller)} ${vehicle(ids.vehicleC, ids.otherSeller)}
  ${listing(ids.listingA, ids.vehicleA, ids.seller, 'Conversation listing')} ${listing(ids.listingB, ids.vehicleB, ids.seller, 'Seller response listing')} ${listing(ids.listingC, ids.vehicleC, ids.otherSeller, 'Other seller listing')}
  ${role("authenticated", ids.buyer)}
  SELECT * INTO TEMP TABLE conversation FROM public.get_or_create_listing_conversation('${ids.listingA}'::uuid);
  ${role("anon")}
  DO $$ BEGIN BEGIN PERFORM * FROM public.attach_own_active_listing_response((SELECT conversation_id FROM conversation),'${ids.listingB}'::uuid); INSERT INTO results VALUES('anon attach denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon attach denied',true); END; END $$;
  ${role("authenticated", ids.seller)}
  SELECT * INTO TEMP TABLE attached FROM public.attach_own_active_listing_response((SELECT conversation_id FROM conversation),'${ids.listingB}'::uuid);
  INSERT INTO results VALUES('seller attaches own active listing',(SELECT count(*)=1 AND bool_and(listing_id='${ids.listingB}'::uuid) FROM attached));
  DO $$ BEGIN BEGIN PERFORM * FROM public.attach_own_active_listing_response((SELECT conversation_id FROM conversation),'${ids.listingC}'::uuid); INSERT INTO results VALUES('other seller listing denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('other seller listing denied',true); END; END $$;
  ${role("authenticated", ids.buyer)}
  SELECT * INTO TEMP TABLE buyer_responses FROM public.list_conversation_listing_responses((SELECT conversation_id FROM conversation));
  INSERT INTO results VALUES('buyer views response without seller internals',(SELECT count(*)=1 AND bool_and(listing_id='${ids.listingB}'::uuid) FROM buyer_responses));
  ${role("authenticated", ids.other)}
  DO $$ BEGIN BEGIN PERFORM * FROM public.attach_own_active_listing_response((SELECT conversation_id FROM conversation),'${ids.listingB}'::uuid); INSERT INTO results VALUES('non seller attach denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('non seller attach denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM * FROM public.list_conversation_listing_responses((SELECT conversation_id FROM conversation)); INSERT INTO results VALUES('non participant response read denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('non participant response read denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM * FROM messaging.conversation_listing_responses; INSERT INTO results VALUES('direct table read denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('direct table read denied',true); END; END $$;
  RESET ROLE;
  SELECT name,ok FROM results ORDER BY name;
  ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0802 listing response ownership/privacy and UI contract passed (${rows.length} checks)`);
