const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "listing", "vehicle", "make", "model", "view", "contact", "favorite", "selfFavorite", "conversation", "buyerMessage", "sellerMessage"].map((name) => [name, randomUUID()]));

const sql = `BEGIN;
  CREATE TEMP TABLE results (name text PRIMARY KEY, ok boolean NOT NULL) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','Analytics Make','analytics-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','Analytics Model','analytics-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by)
  VALUES('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current)
  VALUES('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type)
  VALUES('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','Analytics listing',1,'TRY',false,'Istanbul','private');

  INSERT INTO marketplace.listing_view_events(listing_id,viewer_key,viewed_at,view_hour)
  VALUES('${ids.listing}','${ids.view}',now(),date_trunc('hour',now()));
  INSERT INTO marketplace.listing_view_events(listing_id,viewer_key,viewed_at,view_hour)
  VALUES('${ids.listing}','${ids.view}',now(),date_trunc('hour',now())) ON CONFLICT DO NOTHING;
  INSERT INTO identity.listing_seller_contact_disclosures(id,buyer_id,listing_id)
  VALUES('${ids.contact}','${ids.buyer}','${ids.listing}');
  INSERT INTO marketplace.listing_favorites(id,user_id,listing_id)
  VALUES('${ids.favorite}','${ids.buyer}','${ids.listing}'),('${ids.selfFavorite}','${ids.seller}','${ids.listing}');
  INSERT INTO messaging.conversations(id,listing_id,buyer_id,seller_id)
  VALUES('${ids.conversation}','${ids.listing}','${ids.buyer}','${ids.seller}');
  INSERT INTO messaging.messages(id,conversation_id,sender_id,body)
  VALUES('${ids.buyerMessage}','${ids.conversation}','${ids.buyer}','buyer message private body'),
        ('${ids.sellerMessage}','${ids.conversation}','${ids.seller}','seller reply private body');

  INSERT INTO results VALUES
    ('four source types recorded', (SELECT count(*) = 4 FROM marketplace.seller_analytics_events WHERE listing_id='${ids.listing}')),
    ('view replay idempotent', (SELECT count(*) = 1 FROM marketplace.seller_analytics_events WHERE listing_id='${ids.listing}' AND event_type='view')),
    ('self favorite excluded', NOT EXISTS (SELECT 1 FROM marketplace.seller_analytics_events WHERE event_key='${ids.selfFavorite}')),
    ('seller message excluded', NOT EXISTS (SELECT 1 FROM marketplace.seller_analytics_events WHERE event_key='${ids.sellerMessage}')),
    ('only source identifiers stored', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='seller_analytics_events' AND column_name IN ('phone','email','body','message_body','ip_address','user_agent','raw_payload','provider_reference','auth_token'))),
    ('analytics direct dml private', NOT has_table_privilege('authenticated','marketplace.seller_analytics_events','SELECT,INSERT,UPDATE,DELETE'));

  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"role":"authenticated","sub":"${ids.seller}"}';
  INSERT INTO results VALUES ('seller read model aggregates', (SELECT views=1 AND contact_intents=1 AND favorites=1 AND messages=1 FROM public.list_own_seller_analytics() WHERE listing_id='${ids.listing}'));
  SET LOCAL request.jwt.claims TO '{"role":"authenticated","sub":"${ids.buyer}"}';
  INSERT INTO results VALUES ('non-owner read model empty', NOT EXISTS (SELECT 1 FROM public.list_own_seller_analytics() WHERE listing_id='${ids.listing}'));
  RESET ROLE;
  SELECT name, ok FROM results ORDER BY name;
  ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.includes("|")).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
assert.equal(rows.length, 8, JSON.stringify(rows));
console.log(`seller analytics local ingestion: PASS (${rows.length} checks)`);
