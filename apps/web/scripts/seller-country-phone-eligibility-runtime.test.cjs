const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261101130000_jlc_0524_kazakhstan_seller_phone_eligibility.sql"), "utf8");
const id = { owner: randomUUID(), other: randomUUID(), foreign: randomUUID(), unverified: randomUUID(), kz70: randomUUID(), kz76: randomUUID(), kz77: randomUUID(), ru79: randomUUID(), plus90: randomUUID(), otherKz77: randomUUID() };
const suffix = String(Date.now()).slice(-8);
const phone90 = `+9055${suffix}`;
const phone70 = `+700${suffix}`;
const phone76 = `+760${suffix}`;
const phone77 = `+770${suffix}`;
const russianPhone79 = `+790${suffix}`;
const otherPhone77 = `+771${suffix}`;
const foreignPhone90 = `+9057${suffix}`;
const unverifiedPhone77 = `+772${suffix}`;

function role(role, userId) {
  const claims = JSON.stringify({ role, ...(userId ? { sub: userId } : {}) }).replaceAll("'", "''");
  return `RESET ROLE; SET LOCAL ROLE ${role}; SELECT set_config('request.jwt.claims', '${claims}', TRUE);`;
}

const checks = `
  CREATE TEMP TABLE results(name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO authenticated, anon, service_role;
  INSERT INTO auth.users(instance_id,id,aud,role,phone,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000','${id.owner}','authenticated','authenticated','${phone90}',now(),'{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${id.other}','authenticated','authenticated','${otherPhone77}',now(),'{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${id.foreign}','authenticated','authenticated','${foreignPhone90}',now(),'{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${id.unverified}','authenticated','authenticated','${unverifiedPhone77}',NULL,'{}','{}',now(),now());
  INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone,is_active)
  VALUES
    ('${id.plus90}','${id.owner}','${phone90}',now(),'auth_account_phone',TRUE,TRUE),
    ('${id.kz70}','${id.owner}','${phone70}',now(),'seller_otp',FALSE,TRUE),
    ('${id.kz76}','${id.owner}','${phone76}',now(),'seller_otp',FALSE,TRUE),
    ('${id.kz77}','${id.owner}','${phone77}',now(),'seller_otp',FALSE,TRUE),
    ('${id.ru79}','${id.owner}','${russianPhone79}',now(),'seller_otp',FALSE,TRUE),
    ('${id.otherKz77}','${id.other}','${otherPhone77}',now(),'auth_account_phone',TRUE,TRUE);

  ${role("service_role")}
  INSERT INTO results VALUES ('kz70_contact_is_eligible', identity.is_kazakhstan_e164_phone('${phone70}'));
  INSERT INTO results VALUES ('kz76_contact_is_eligible', identity.is_kazakhstan_e164_phone('${phone76}'));
  INSERT INTO results VALUES ('kz77_contact_is_eligible', identity.is_kazakhstan_e164_phone('${phone77}'));
  INSERT INTO results VALUES ('russian79_contact_is_not_eligible', NOT identity.is_kazakhstan_e164_phone('${russianPhone79}'));

  ${role("authenticated", id.owner)}
  INSERT INTO results VALUES ('kz_owner_is_eligible', public.is_kazakhstan_seller_phone_verified());
  INSERT INTO results VALUES ('only_kz_contacts_are_listed', (SELECT count(*) = 3 AND bool_and(contact_id IN ('${id.kz70}'::uuid, '${id.kz76}'::uuid, '${id.kz77}'::uuid)) FROM public.list_own_kazakhstan_seller_contact_phones()));
  DO $$ DECLARE v_make UUID; v_model UUID; v_city UUID; v_listing UUID; BEGIN
    SELECT model.make_id, model.id INTO v_make, v_model
    FROM vehicle.models AS model JOIN vehicle.makes AS make ON make.id = model.make_id
    WHERE make.is_active AND model.is_active ORDER BY model.id LIMIT 1;
    SELECT city.id INTO v_city FROM marketplace.cities AS city
    WHERE city.country_code = 'KZ' AND city.is_active ORDER BY city.sort_order, city.id LIMIT 1;
    SELECT listing_id INTO v_listing FROM public.create_own_listing_draft_v2(
      v_make, v_model, NULL::uuid, 2021::smallint, 1, 'used'::text,
      'gasoline'::vehicle.fuel_type, 'automatic'::vehicle.transmission_type,
      'sedan'::text, 'front'::text, 'test'::text, 1.6::numeric, 'unknown'::text,
      1::smallint, 'KZ seller contact runtime test'::text, '1000000'::text,
      'KZT'::text, FALSE, 'Almaty'::text, '${id.kz77}'::uuid, v_city, NULL::uuid
    );
    INSERT INTO results VALUES ('verified_kz77_can_create_kz_draft', v_listing IS NOT NULL);
  END $$;
  DO $$ BEGIN
    PERFORM public.create_own_listing_draft_v2(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'${id.plus90}'::uuid,NULL,NULL);
    INSERT INTO results VALUES ('non_kz_contact_rejected_at_create', FALSE);
  EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('non_kz_contact_rejected_at_create', TRUE); END $$;
  DO $$ BEGIN
    PERFORM public.create_own_listing_draft_v2(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'${id.ru79}'::uuid,NULL,NULL);
    INSERT INTO results VALUES ('russian79_contact_rejected_at_create', FALSE);
  EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('russian79_contact_rejected_at_create', TRUE); END $$;
  DO $$ BEGIN
    PERFORM public.set_own_listing_seller_contact_phone(gen_random_uuid(), '${id.otherKz77}'::uuid);
    INSERT INTO results VALUES ('unrelated_contact_rejected', FALSE);
  EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('unrelated_contact_rejected', TRUE); END $$;
  DO $$ BEGIN
    PERFORM public.create_own_private_listing_draft(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
    INSERT INTO results VALUES ('legacy_private_creator_not_callable', FALSE);
  EXCEPTION WHEN SQLSTATE '42501' THEN INSERT INTO results VALUES ('legacy_private_creator_not_callable', TRUE); END $$;

  ${role("authenticated", id.other)}
  INSERT INTO results VALUES ('kz77_account_can_sell', public.is_kazakhstan_seller_phone_verified());
  ${role("authenticated", id.foreign)}
  INSERT INTO results VALUES ('non_plus7_account_without_plus7_cannot_sell', NOT public.is_kazakhstan_seller_phone_verified());
  ${role("authenticated", id.unverified)}
  INSERT INTO results VALUES ('unverified_kz77_cannot_sell', NOT public.is_kazakhstan_seller_phone_verified());

  ${role("service_role")}
  INSERT INTO results VALUES ('verified_kz77_reusable_without_otp', public.has_active_seller_contact_phone_service('${id.owner}'::uuid, '${phone77}'));

  RESET ROLE;
  SELECT name, ok FROM results ORDER BY name;
`;

const sql = migration.replace(/COMMIT;\s*$/, () => `${checks}\nROLLBACK;`);
const result = spawnSync("docker", ["exec", "-i", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], {
  input: sql,
  encoding: "utf8"
});
assert.equal(result.status, 0, result.stderr || result.stdout);
const rows = result.stdout.trim().split(/\r?\n/).filter((line) => line.includes("|")).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], result.stdout);
assert.equal(rows.length, 15, result.stdout);
console.log("seller-country-phone-eligibility runtime matrix: PASS");
