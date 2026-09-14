const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260914194718_functional_02j_lifecycle_edit_completion.sql"), "utf8");
for (const value of ["REVOKE UPDATE ON marketplace.listings FROM authenticated;", "CREATE OR REPLACE FUNCTION public.save_own_rejected_listing(", "v_next_status := 'draft'; v_next_moderation_status := 'pending_review';", "'listing.edit_resubmit'", "set_own_listing_cover_media", "vehicle.is_current_profile_owner"]) assert.ok(migration.includes(value), value);
assert.doesNotMatch(migration, /GRANT\s+(?:ALL|UPDATE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "listing", "vehicle", "make", "model"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;

const sql = `BEGIN;
  CREATE TEMP TABLE functional_02j_results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON functional_02j_results TO anon, authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','j-seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
         ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','j-buyer-${ids.buyer}@test.invalid','{}','{}',now(),now());
  INSERT INTO vehicle.makes (id,name,slug) VALUES ('${ids.make}','J Make','j-make-${ids.make}');
  INSERT INTO vehicle.models (id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','J Model','j-model-${ids.model}');
  INSERT INTO vehicle.vehicle_profiles (id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by)
  VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.seller}');
  INSERT INTO vehicle.profile_ownership (vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.seller}','owner',true);
  INSERT INTO marketplace.listings (id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type)
  VALUES ('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','J listing',100000,'TRY',false,'Istanbul','private');
  INSERT INTO functional_02j_results VALUES
    ('authenticated direct listing update revoked', NOT has_table_privilege('authenticated','marketplace.listings','UPDATE')),
    ('anon save execute revoked', NOT has_function_privilege('anon','public.save_own_rejected_listing(uuid,timestamptz,timestamptz,uuid,uuid,smallint,integer,text,vehicle.fuel_type,vehicle.transmission_type,text,text,text,numeric,text,smallint,text,text,text,boolean,text)','EXECUTE'));
  ${role("authenticated", ids.seller)}
  SELECT * FROM public.save_own_rejected_listing('${ids.listing}'::uuid, (SELECT updated_at FROM marketplace.listings WHERE id='${ids.listing}'), (SELECT updated_at FROM vehicle.vehicle_profiles WHERE id='${ids.vehicle}'), '${ids.make}'::uuid,'${ids.model}'::uuid,2024::smallint,101,'used','gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL,NULL,NULL,1.6,'unknown',NULL,'updated','110000','TRY',false,'Istanbul');
  RESET ROLE;
  INSERT INTO functional_02j_results VALUES
    ('active edit enters pending review', EXISTS (SELECT 1 FROM marketplace.listings WHERE id='${ids.listing}' AND status='draft' AND moderation_status='pending_review')),
    ('active edit audit is recorded', EXISTS (SELECT 1 FROM public.admin_audit_logs WHERE entity_id='${ids.listing}' AND action='listing.edit_resubmit'));
  ${role("authenticated", ids.buyer)}
  DO $$ BEGIN BEGIN PERFORM * FROM public.get_own_rejected_listing_for_edit('${ids.listing}'); INSERT INTO functional_02j_results VALUES ('cross owner denied', false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO functional_02j_results VALUES ('cross owner denied', true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM * FROM public.review_listing_moderation('${ids.listing}','approve',NULL); INSERT INTO functional_02j_results VALUES ('self approval denied', false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO functional_02j_results VALUES ('self approval denied', true); END; END $$;
  ${role("anon")}
  DO $$ BEGIN BEGIN PERFORM * FROM public.save_own_rejected_listing('${ids.listing}'::uuid,now(),now(),'${ids.make}'::uuid,'${ids.model}'::uuid,2024::smallint,1,'used','gasoline'::vehicle.fuel_type,'automatic'::vehicle.transmission_type,NULL,NULL,NULL,1.6,'unknown',NULL,NULL,'1','TRY',false,'Istanbul'); INSERT INTO functional_02j_results VALUES ('anon edit denied', false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO functional_02j_results VALUES ('anon edit denied', true); END; END $$;
  SELECT name, ok FROM functional_02j_results ORDER BY name;
  ROLLBACK;`;
const result = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(result.filter(([, ok]) => ok !== "t"), [], JSON.stringify(result));
console.log(`FUNCTIONAL-02J lifecycle/edit matrix passed (${result.length} checks)`);
