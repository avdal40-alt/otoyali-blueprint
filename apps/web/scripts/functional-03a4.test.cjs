const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const webRoot = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260915170302_functional_03a4_messaging_safety.sql"), "utf8");
const reportsSection = migration.slice(migration.indexOf("CREATE TABLE messaging.conversation_reports"), migration.indexOf("CREATE FUNCTION messaging.validate_conversation_block"));
for (const token of ["CREATE TABLE messaging.conversation_blocks", "CREATE TABLE messaging.conversation_reports", "CREATE OR REPLACE FUNCTION public.send_conversation_message", "CREATE FUNCTION public.block_conversation_participant", "CREATE FUNCTION public.unblock_conversation_participant", "CREATE FUNCTION public.report_conversation", "CREATE FUNCTION public.report_conversation_message", "REVOKE ALL ON TABLE messaging.conversation_reports FROM PUBLIC, anon, authenticated"]) assert.ok(migration.includes(token), token);
assert.doesNotMatch(reportsSection, /body|phone|vin|audit/i, "report records contain identifiers and reason only");
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)[^;]*conversation_(?:blocks|reports)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i, "safety tables remain private");

const read = (...parts) => fs.readFileSync(path.join(webRoot, ...parts), "utf8");
const helper = read("src", "lib", "messaging", "conversation-api.ts");
const blockRoute = read("src", "app", "api", "conversations", "[id]", "block", "route.ts");
const conversationReportRoute = read("src", "app", "api", "conversations", "[id]", "report", "route.ts");
const messageReportRoute = read("src", "app", "api", "conversations", "[id]", "messages", "[messageId]", "report", "route.ts");
const messageRoute = read("src", "app", "api", "conversations", "[id]", "messages", "route.ts");
for (const source of [blockRoute, conversationReportRoute, messageReportRoute, messageRoute]) {
  assert.match(source, /requireAuthenticatedRequest\(request\.headers\.get\("authorization"\)\)/, "private route authenticates server-side");
  assert.match(source, /privateResponseHeaders/, "private route is no-store");
  assert.doesNotMatch(source, /console\.(?:log|warn|error)/, "private route does not log sensitive request data");
}
for (const token of ["parseReportPayload", "block_conversation_participant", "unblock_conversation_participant", "report_conversation", "report_conversation_message", "rateLimit(authenticated.userId, \"safety\")"]) assert.ok([helper, blockRoute, conversationReportRoute, messageReportRoute].join("\n").includes(token), token);
assert.doesNotMatch([blockRoute, conversationReportRoute, messageReportRoute].join("\n"), /blockerId|blockedUserId|reporterId|buyerId|sellerId|phone|vin|service_role|SUPABASE_SERVICE/i, "browser cannot forge identities or access private data");
assert.match(messageRoute, /rpc\("send_conversation_message", \{ p_conversation_id: id, p_body: text \}\)/, "message API delegates to the database-enforced send boundary");
assert.match(migration, /FROM messaging\.conversation_blocks AS block[\s\S]*block\.unblocked_at IS NULL/, "blocked send is denied below the API");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "other", "listing", "vehicle", "make", "model"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO anon, authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','other-${ids.other}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes(id,name,slug) VALUES('${ids.make}','Safety Make','safety-${ids.make}');
  INSERT INTO vehicle.models(id,make_id,name,slug) VALUES('${ids.model}','${ids.make}','Safety Model','safety-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','Safety listing',1,'TRY',false,'Istanbul','private');
  ${role("anon")}
  DO $$ BEGIN BEGIN PERFORM public.block_conversation_participant('${ids.listing}'::uuid); INSERT INTO results VALUES('anon block denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon block denied',true); END; BEGIN PERFORM public.report_conversation('${ids.listing}'::uuid,'fraud'); INSERT INTO results VALUES('anon report denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon report denied',true); END; END $$;
  ${role("authenticated", ids.buyer)}
  SELECT * INTO TEMP TABLE conversation FROM public.get_or_create_listing_conversation('${ids.listing}'::uuid);
  SELECT * INTO TEMP TABLE original_message FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'private test message');
  SELECT public.block_conversation_participant((SELECT conversation_id FROM conversation));
  SELECT public.block_conversation_participant((SELECT conversation_id FROM conversation));
  RESET ROLE;
  INSERT INTO results VALUES('participant block counterpart',(SELECT count(*) = 1 FROM messaging.conversation_blocks WHERE conversation_id = (SELECT conversation_id FROM conversation) AND blocker_id = '${ids.buyer}'::uuid AND blocked_user_id = '${ids.seller}'::uuid AND unblocked_at IS NULL)),('duplicate block deterministic',(SELECT count(*) = 1 FROM messaging.conversation_blocks WHERE conversation_id = (SELECT conversation_id FROM conversation) AND unblocked_at IS NULL));
  ${role("authenticated", ids.buyer)}
  DO $$ BEGIN BEGIN PERFORM * FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'blocked'); INSERT INTO results VALUES('blocked sender denied at db',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('blocked sender denied at db',true); END; END $$;
  INSERT INTO results VALUES('history remains readable buyer',(SELECT count(*) = 1 FROM public.list_conversation_messages((SELECT conversation_id FROM conversation),50,NULL,NULL)));
  ${role("authenticated", ids.seller)}
  DO $$ BEGIN BEGIN PERFORM * FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'blocked'); INSERT INTO results VALUES('blocked counterpart denied at db',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('blocked counterpart denied at db',true); END; END $$;
  INSERT INTO results VALUES('history remains readable seller',(SELECT count(*) = 1 FROM public.list_conversation_messages((SELECT conversation_id FROM conversation),50,NULL,NULL)));
  ${role("authenticated", ids.other)}
  DO $$ BEGIN BEGIN PERFORM public.block_conversation_participant((SELECT conversation_id FROM conversation)); INSERT INTO results VALUES('unrelated block denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('unrelated block denied',true); END; BEGIN PERFORM public.report_conversation((SELECT conversation_id FROM conversation),'fraud'); INSERT INTO results VALUES('unrelated conversation report denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('unrelated conversation report denied',true); END; BEGIN PERFORM public.report_conversation_message((SELECT conversation_id FROM conversation),(SELECT message_id FROM original_message),'fraud'); INSERT INTO results VALUES('unrelated message report denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('unrelated message report denied',true); END; BEGIN PERFORM public.report_conversation((SELECT conversation_id FROM conversation),'forged_reason'); INSERT INTO results VALUES('invalid reason denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('invalid reason denied',true); END; BEGIN PERFORM public.report_conversation((SELECT conversation_id FROM conversation),NULL); INSERT INTO results VALUES('null reason denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('null reason denied',true); END; BEGIN PERFORM * FROM public.list_conversation_messages((SELECT conversation_id FROM conversation),50,NULL,NULL); INSERT INTO results VALUES('ordinary staff unrelated access denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES('ordinary staff unrelated access denied',true); END; END $$;
  ${role("authenticated", ids.buyer)}
  SELECT public.unblock_conversation_participant((SELECT conversation_id FROM conversation));
  SELECT * INTO TEMP TABLE restored_message FROM public.send_conversation_message((SELECT conversation_id FROM conversation),'restored');
  RESET ROLE;
  INSERT INTO results VALUES('unblock restores send',(SELECT count(*) = 1 FROM restored_message));
  ${role("authenticated", ids.buyer)}
  SELECT public.report_conversation((SELECT conversation_id FROM conversation),'fraud');
  SELECT public.report_conversation_message((SELECT conversation_id FROM conversation),(SELECT message_id FROM original_message),'inappropriate_content');
  RESET ROLE;
  INSERT INTO results VALUES('own conversation report pass',(SELECT count(*) = 1 FROM messaging.conversation_reports WHERE conversation_id = (SELECT conversation_id FROM conversation) AND message_id IS NULL AND reporter_id = '${ids.buyer}'::uuid)),('own message report pass',(SELECT count(*) = 1 FROM messaging.conversation_reports WHERE message_id = (SELECT message_id FROM original_message) AND reporter_id = '${ids.buyer}'::uuid));
  ${role("authenticated", ids.seller)}
  DO $$ BEGIN BEGIN PERFORM count(*) FROM messaging.conversation_reports; INSERT INTO results VALUES('reporter identity hidden',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('reporter identity hidden',true); END; END $$;
  RESET ROLE;
  SELECT name,ok FROM results ORDER BY name; ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`FUNCTIONAL-03A4 messaging safety matrix passed (${rows.length} checks)`);
