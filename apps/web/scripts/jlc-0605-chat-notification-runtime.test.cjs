const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "outsider", "listing", "vehicle", "make", "model"].map((name) => [name, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const role = (sub) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(sub)}';`;

const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','Chat alert Make','chat-alert-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','Chat alert Model','chat-alert-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','Chat alert listing',1,'KZT',false,'Almaty','private');
  ${role(ids.buyer)}
  SELECT * INTO TEMP TABLE conversation FROM public.get_or_create_listing_conversation('${ids.listing}'::uuid);
  SELECT * INTO TEMP TABLE buyer_message FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'Private body must not be copied');
  INSERT INTO results VALUES('sender has no chat notification',(SELECT count(*) = 0 FROM marketplace.list_own_notifications_v2(20,NULL,NULL) WHERE notification_type = 'chat_message'));
  ${role(ids.seller)}
  INSERT INTO results VALUES('recipient receives intended chat notification',(
    SELECT count(*) = 1
    FROM marketplace.list_own_notifications_v2(20,NULL,NULL)
    WHERE notification_type = 'chat_message'
      AND conversation_id = (SELECT conversation_id FROM conversation)
      AND message_id = (SELECT message_id FROM buyer_message)
      AND read_at IS NULL
  ));
  SELECT public.mark_conversation_read((SELECT conversation_id FROM conversation),(SELECT message_id FROM buyer_message));
  INSERT INTO results VALUES('conversation read marks recipient notification read',(
    SELECT count(*) = 1
    FROM marketplace.list_own_notifications_v2(20,NULL,NULL)
    WHERE notification_type = 'chat_message'
      AND conversation_id = (SELECT conversation_id FROM conversation)
      AND read_at IS NOT NULL
  ));
  ${role(ids.outsider)}
  INSERT INTO results VALUES('non-participant cannot read chat notification',(SELECT count(*) = 0 FROM marketplace.list_own_notifications_v2(20,NULL,NULL) WHERE notification_type = 'chat_message'));
  RESET ROLE;
  INSERT INTO results VALUES('chat notification table remains private',(NOT has_table_privilege('anon','marketplace.notifications','SELECT') AND NOT has_table_privilege('authenticated','marketplace.notifications','SELECT')));
  INSERT INTO results VALUES('chat notification RPCs deny anon',(NOT has_function_privilege('anon','public.send_conversation_message(uuid,text)','EXECUTE') AND NOT has_function_privilege('anon','public.mark_conversation_read(uuid,uuid)','EXECUTE')));
  SELECT name,ok FROM results ORDER BY name;
  ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0605 chat notification runtime matrix passed (${rows.length} checks)`);
