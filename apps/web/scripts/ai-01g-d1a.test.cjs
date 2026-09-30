const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "ordinary", "admin", "inactive", "make", "model", "approve", "reject", "stale", "other", "runApprove", "runReject", "runOld", "runCurrent", "runOther", "vehicleApprove", "vehicleReject", "vehicleStale", "vehicleOther"].map((name) => [name, randomUUID()]));
const claim = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const as = (role, sub) => `RESET ROLE; SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claims TO '${claim(role, sub)}';`;
const listing = (name) => `('${ids[name]}','${ids[`vehicle${name[0].toUpperCase()}${name.slice(1)}`]}','${ids.seller}','draft','pending_review','D1A ${name}',100000,'TRY',false,'Istanbul','private')`;

const sql = `BEGIN;
CREATE TEMP TABLE d1a_results(name text primary key, ok boolean not null) ON COMMIT DROP;
GRANT SELECT, INSERT ON d1a_results TO anon, authenticated;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','d1a-seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.ordinary}','authenticated','authenticated','d1a-user-${ids.ordinary}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.admin}','authenticated','authenticated','d1a-admin-${ids.admin}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.inactive}','authenticated','authenticated','d1a-inactive-${ids.inactive}@test.invalid','{}','{}',now(),now());
INSERT INTO public.admin_users(user_id,role,is_active) VALUES ('${ids.admin}','moderator',true),('${ids.inactive}','moderator',false);
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','D1A Make','d1a-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','D1A Model','d1a-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES
('${ids.vehicleApprove}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}'),
('${ids.vehicleReject}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}'),
('${ids.vehicleStale}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}'),
('${ids.vehicleOther}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.seller}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES
('${ids.vehicleApprove}','${ids.seller}','owner',true),('${ids.vehicleReject}','${ids.seller}','owner',true),('${ids.vehicleStale}','${ids.seller}','owner',true),('${ids.vehicleOther}','${ids.seller}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ${listing("approve")},${listing("reject")},${listing("stale")},${listing("other")};
INSERT INTO marketplace.listing_moderation_runs(id,listing_id,engine,ruleset_version,recommended_action,created_at) VALUES
('${ids.runApprove}','${ids.approve}','system','d1a','review',now()-interval '4 minutes'),
('${ids.runReject}','${ids.reject}','system','d1a','review',now()-interval '3 minutes'),
('${ids.runOld}','${ids.stale}','system','d1a','review',now()-interval '2 minutes'),
('${ids.runCurrent}','${ids.stale}','system','d1a','review',now()-interval '1 minute'),
('${ids.runOther}','${ids.other}','system','d1a','review',now());
INSERT INTO marketplace.listing_moderation_signals(run_id,code,severity,confidence,source,field_name,evidence_class,evidence_excerpt,rule_id,recommended_action) VALUES ('${ids.runApprove}','SPAM_PATTERN','medium','high','deterministic','description','d1a','[repetition]','d1a','review');
INSERT INTO d1a_results VALUES ('direct authenticated override insert denied',NOT has_table_privilege('authenticated','marketplace.listing_moderation_overrides','INSERT'));
${as("anon")}
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.approve}','${ids.runApprove}','approve',NULL,NULL); INSERT INTO d1a_results VALUES ('anonymous denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO d1a_results VALUES ('anonymous denied',true); END; END $$;
${as("authenticated", ids.ordinary)}
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.approve}','${ids.runApprove}','approve',NULL,NULL); INSERT INTO d1a_results VALUES ('ordinary user denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO d1a_results VALUES ('ordinary user denied',true); END; END $$;
${as("authenticated", ids.inactive)}
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.approve}','${ids.runApprove}','approve',NULL,NULL); INSERT INTO d1a_results VALUES ('inactive admin denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO d1a_results VALUES ('inactive admin denied',true); END; END $$;
${as("authenticated", ids.admin)}
SELECT * FROM public.review_listing_moderation_with_override('${ids.approve}','${ids.runApprove}','approve',NULL,NULL);
RESET ROLE;
INSERT INTO d1a_results VALUES
('approve lifecycle applied',EXISTS(SELECT 1 FROM marketplace.listings WHERE id='${ids.approve}' AND status='active' AND moderation_status='active')),
('approve override actor derived',EXISTS(SELECT 1 FROM marketplace.listing_moderation_overrides WHERE run_id='${ids.runApprove}' AND moderator_user_id='${ids.admin}' AND decision='allow')),
('machine signals preserved',EXISTS(SELECT 1 FROM marketplace.listing_moderation_signals WHERE run_id='${ids.runApprove}')),
('approve admin audit preserved',EXISTS(SELECT 1 FROM public.admin_audit_logs WHERE entity_id='${ids.approve}' AND action='listing.approve'));
${as("authenticated", ids.admin)}
SELECT * FROM public.review_listing_moderation_with_override('${ids.reject}','${ids.runReject}','reject','policy.violation','Factual policy violation.');
RESET ROLE;
INSERT INTO d1a_results VALUES ('reject lifecycle applied',EXISTS(SELECT 1 FROM marketplace.listings WHERE id='${ids.reject}' AND status='removed' AND moderation_status='rejected')),
('reject override persisted',EXISTS(SELECT 1 FROM marketplace.listing_moderation_overrides WHERE run_id='${ids.runReject}' AND moderator_user_id='${ids.admin}' AND decision='block' AND reason_code='policy.violation'));
${as("authenticated", ids.admin)}
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.stale}','${ids.runOld}','approve',NULL,NULL); INSERT INTO d1a_results VALUES ('stale run denied',false); EXCEPTION WHEN SQLSTATE 'OT409' THEN INSERT INTO d1a_results VALUES ('stale run denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.stale}','${ids.runOther}','approve',NULL,NULL); INSERT INTO d1a_results VALUES ('cross listing run denied',false); EXCEPTION WHEN SQLSTATE 'OT409' THEN INSERT INTO d1a_results VALUES ('cross listing run denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.stale}','${ids.runCurrent}','unknown',NULL,NULL); INSERT INTO d1a_results VALUES ('invalid decision denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO d1a_results VALUES ('invalid decision denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation_with_override('${ids.stale}','${ids.runCurrent}','reject','rollback.test',repeat('x',1601)); INSERT INTO d1a_results VALUES ('lifecycle rollback denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO d1a_results VALUES ('lifecycle rollback denied',true); END; END $$;
RESET ROLE;
INSERT INTO d1a_results VALUES ('rollback leaves no override',NOT EXISTS(SELECT 1 FROM marketplace.listing_moderation_overrides WHERE run_id='${ids.runCurrent}'));
SELECT name,ok FROM d1a_results ORDER BY name;
ROLLBACK;`;
const result = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(result.filter(([, ok]) => ok !== "t"), [], JSON.stringify(result));
console.log(`AI-01G-D1A atomic human moderation decision contract passed (${result.length} checks)`);
