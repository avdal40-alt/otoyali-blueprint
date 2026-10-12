const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "listing", "vehicle", "make", "model"].map((name) => [name, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const role = (sub) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(sub)}';`;

const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','Unread Make','unread-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','Unread Model','unread-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','Unread listing',1,'KZT',false,'Almaty','private');
  ${role(ids.buyer)}
  SELECT * INTO TEMP TABLE conversation FROM public.get_or_create_listing_conversation('${ids.listing}'::uuid);
  SELECT * INTO TEMP TABLE buyer_message FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'Buyer message');
  INSERT INTO results VALUES('sender has no unread messages',(SELECT unread_count = 0 FROM public.list_own_conversations(20,NULL,NULL) WHERE conversation_id = (SELECT conversation_id FROM conversation)));
  ${role(ids.seller)}
  INSERT INTO results VALUES('recipient sees one unread message',(SELECT unread_count = 1 FROM public.list_own_conversations(20,NULL,NULL) WHERE conversation_id = (SELECT conversation_id FROM conversation)));
  SELECT public.mark_conversation_read((SELECT conversation_id FROM conversation),(SELECT message_id FROM buyer_message));
  INSERT INTO results VALUES('read clears recipient unread count',(SELECT unread_count = 0 FROM public.list_own_conversations(20,NULL,NULL) WHERE conversation_id = (SELECT conversation_id FROM conversation)));
  SELECT * INTO TEMP TABLE seller_message FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'Seller reply');
  INSERT INTO results VALUES('reply sender has no unread messages',(SELECT unread_count = 0 FROM public.list_own_conversations(20,NULL,NULL) WHERE conversation_id = (SELECT conversation_id FROM conversation)));
  ${role(ids.buyer)}
  INSERT INTO results VALUES('reply recipient sees one unread message',(SELECT unread_count = 1 FROM public.list_own_conversations(20,NULL,NULL) WHERE conversation_id = (SELECT conversation_id FROM conversation)));
  RESET ROLE;
  SELECT name,ok FROM results ORDER BY name;
  ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0603 unread runtime matrix passed (${rows.length} checks)`);
