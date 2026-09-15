const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260915114703_functional_03a1_conversation_security_contract.sql"), "utf8");
for (const token of ["CREATE SCHEMA IF NOT EXISTS messaging", "UNIQUE (listing_id, buyer_id)", "SECURITY DEFINER SET search_path = ''", "REVOKE ALL ON ALL TABLES IN SCHEMA messaging FROM authenticated", "char_length(body) <= 2000", "LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)"]) assert.ok(migration.includes(token), token);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)[^;]*messaging[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "otherBuyer", "listing", "vehicle", "make", "model"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const call = `public.get_or_create_listing_conversation('${ids.listing}'::uuid)`;
const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO anon, authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.otherBuyer}','authenticated','authenticated','other-${ids.otherBuyer}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','Chat Make','chat-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','Chat Model','chat-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','Chat listing',1,'TRY',false,'Istanbul','private');
  ${role("anon")}
  DO $$ BEGIN BEGIN PERFORM * FROM ${call}; INSERT INTO results VALUES('anon denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon denied',true); END; END $$;
  ${role("authenticated", ids.buyer)}
  SELECT * INTO TEMP TABLE buyer_conversation FROM ${call};
  SELECT * INTO TEMP TABLE buyer_conversation_repeat FROM ${call};
  INSERT INTO results VALUES('buyer creates canonical conversation',(SELECT count(*)=1 FROM buyer_conversation)),('duplicate constrained',(SELECT conversation_id FROM buyer_conversation)=(SELECT conversation_id FROM buyer_conversation_repeat));
  SELECT * INTO TEMP TABLE buyer_message FROM public.send_conversation_message((SELECT conversation_id FROM buyer_conversation),'Merhaba İstanbul 🚗');
  INSERT INTO results VALUES('unicode message accepted',(SELECT count(*)=1 FROM buyer_message)),('buyer list private',(SELECT count(*)=1 FROM public.list_own_conversations(50,NULL,NULL)));
  DO $$ BEGIN BEGIN PERFORM * FROM public.send_conversation_message((SELECT conversation_id FROM buyer_conversation),'   '); INSERT INTO results VALUES('blank denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('blank denied',true); END; END $$;
  ${role("authenticated", ids.seller)}
  INSERT INTO results VALUES('seller reads own listing conversation',(SELECT count(*)=1 FROM public.list_conversation_messages((SELECT conversation_id FROM buyer_conversation),100,NULL,NULL)));
  SELECT public.mark_conversation_read((SELECT conversation_id FROM buyer_conversation),(SELECT message_id FROM buyer_message));
  ${role("authenticated", ids.otherBuyer)}
  DO $$ BEGIN BEGIN PERFORM * FROM public.list_conversation_messages((SELECT conversation_id FROM buyer_conversation),50,NULL,NULL); INSERT INTO results VALUES('cross user denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('cross user denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM * FROM public.send_conversation_message((SELECT conversation_id FROM buyer_conversation),'no'); INSERT INTO results VALUES('cross send denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('cross send denied',true); END; END $$;
  ${role("authenticated", ids.seller)}
  INSERT INTO results VALUES('self contact denied',(SELECT count(*)=0 FROM ${call}));
  RESET ROLE;
  SELECT name,ok FROM results ORDER BY name; ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`FUNCTIONAL-03A1 conversation security matrix passed (${rows.length} checks)`);
