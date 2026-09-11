const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const migrationName = "20260908185347_seller_contact_facade.sql";
const migrationPath = path.join(repoRoot, "supabase", "migrations", migrationName);
const migration = fs.readFileSync(migrationPath, "utf8");
const executableMigration = migration
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function includesAll(source, values) {
  for (const value of values) {
    assert.ok(source.includes(value), `Expected source to include: ${value}`);
  }
}

includesAll(migration, [
  "CREATE FUNCTION public.get_listing_seller_contact(p_listing_id UUID)",
  "RETURNS TABLE (phone TEXT)",
  "STABLE",
  "SECURITY DEFINER",
  "SET search_path = ''",
  "v_user_id UUID := auth.uid()",
  "RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'",
  "FROM marketplace.listings AS listing",
  "INNER JOIN vehicle.vehicle_profiles AS vehicle_profile",
  "INNER JOIN vehicle.makes AS make",
  "INNER JOIN vehicle.models AS model",
  "INNER JOIN vehicle.makes AS parent_make",
  "ON parent_make.id = model.make_id",
  "INNER JOIN public.profiles AS seller",
  "listing.id = p_listing_id",
  "listing.seller_id <> v_user_id",
  "listing.status = 'active'",
  "listing.moderation_status = 'active'",
  "vehicle_profile.profile_status = 'active'",
  "make.is_active = TRUE",
  "model.is_active = TRUE",
  "parent_make.is_active = TRUE",
  "seller.phone IS NOT NULL",
  "seller.phone ~ '^\\+[1-9][0-9]{1,14}$'",
  "LIMIT 1",
  "REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM PUBLIC;",
  "REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM anon;",
  "REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM service_role;",
  "REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM authenticated;",
  "GRANT EXECUTE ON FUNCTION public.get_listing_seller_contact(UUID) TO authenticated;"
]);

const forbiddenContractTokens = [
  ["privacy", "show", "phone"].join("_"),
  ["set", "own", "phone", "visibility"].join("_"),
  ["identity", ["user", "settings"].join("_")].join(".")
];

for (const token of forbiddenContractTokens) {
  assert.equal(migration.includes(token), false, `Forbidden contract dependency: ${token}`);
}

assert.equal((executableMigration.match(/\bCREATE\s+FUNCTION\b/gi) ?? []).length, 1);
assert.doesNotMatch(executableMigration, /\bCREATE\s+OR\s+REPLACE\s+FUNCTION\b/i);
assert.doesNotMatch(executableMigration, /\b(?:CREATE|ALTER|DROP)\s+(?:OR\s+REPLACE\s+)?VIEW\b/i);
assert.doesNotMatch(executableMigration, /\b(?:CREATE|ALTER|DROP)\s+POLICY\b/i);
assert.doesNotMatch(executableMigration, /\bALTER\s+TABLE\b/i);
assert.doesNotMatch(executableMigration, /\b(?:INSERT|UPDATE|DELETE)\b/i);

console.log("PASS seller contact source contract");

if (!process.argv.includes("--db")) {
  process.exit(0);
}

assert.equal(
  process.argv.includes("--source-only"),
  false,
  "--source-only and --db cannot be combined"
);

const studioUrl = new URL(process.env.SUPABASE_STUDIO_URL || "http://127.0.0.1:54323");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(studioUrl.hostname), "Local Studio host required");
assert.equal(studioUrl.protocol, "http:", "Local Studio must use HTTP");
assert.equal(`${studioUrl.username}${studioUrl.password}`, "", "Credentials in Studio URL are forbidden");

function redact(value) {
  return String(value)
    .replace(/\+[1-9][0-9]{1,14}/g, "[REDACTED_PHONE]")
    .replace(/\b[1-9][0-9]{7,14}\b/g, "[REDACTED_DIGITS]");
}

async function query(sql) {
  const response = await fetch(new URL("/api/platform/pg-meta/default/query", studioUrl), {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(60000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Local DB query failed (${response.status}): ${redact(body)}`);
  }
  return body ? JSON.parse(body) : [];
}

function sqlLiteral(value) {
  return value.replaceAll("'", "''");
}

async function runtime() {
  const ids = {
    seller: randomUUID(),
    buyer: randomUUID(),
    listing: randomUUID(),
    missingListing: randomUUID(),
    vehicle: randomUUID(),
    make: randomUUID(),
    parentMake: randomUUID(),
    model: randomUUID()
  };
  const phone = "+15550002001";
  const contactSignature = "public.get_listing_seller_contact(uuid)";
  const contactCall = `public.get_listing_seller_contact('${ids.listing}'::uuid)`;
  const checks = [];

  function check(name, expression) {
    checks.push(name);
    return `INSERT INTO seller_contact_results VALUES ('${sqlLiteral(name)}', COALESCE((${expression}), FALSE));`;
  }

  function setRole(role, userId) {
    const claims = JSON.stringify({ role, ...(userId ? { sub: userId } : {}) });
    return `RESET ROLE;
      SET LOCAL ROLE ${role};
      SELECT set_config('request.jwt.claims', '${sqlLiteral(claims)}', TRUE);`;
  }

  function noContact(name) {
    return check(name, `NOT EXISTS (SELECT 1 FROM ${contactCall})`);
  }

  function contact(name) {
    return check(name, `(SELECT count(*) = 1 AND min(phone) = '${phone}' FROM ${contactCall})`);
  }

  function expectError(name, statement, sqlState) {
    checks.push(name);
    return `DO $expected_error$
      BEGIN
        BEGIN
          ${statement};
          INSERT INTO seller_contact_results VALUES ('${sqlLiteral(name)}', FALSE);
        EXCEPTION WHEN SQLSTATE '${sqlState}' THEN
          INSERT INTO seller_contact_results VALUES ('${sqlLiteral(name)}', TRUE);
        END;
      END
    $expected_error$;`;
  }

  // Successful execution reaches the trailing rollback. A transport or SQL
  // failure can interrupt first, so this script does not claim error-path cleanup.
  let sql = `
    BEGIN;
    SET LOCAL statement_timeout = '45s';

    CREATE TEMP TABLE seller_contact_results (
      test TEXT PRIMARY KEY,
      passed BOOLEAN NOT NULL
    ) ON COMMIT DROP;
    GRANT SELECT, INSERT ON seller_contact_results TO anon, authenticated, service_role;

    INSERT INTO auth.users (
      instance_id, id, aud, role, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES
      (
        '00000000-0000-0000-0000-000000000000', '${ids.seller}',
        'authenticated', 'authenticated', '15550002001', pg_catalog.now(),
        '{"provider":"phone","providers":["phone"]}'::jsonb, '{}'::jsonb,
        pg_catalog.now(), pg_catalog.now()
      ),
      (
        '00000000-0000-0000-0000-000000000000', '${ids.buyer}',
        'authenticated', 'authenticated', NULL, NULL,
        '{}'::jsonb, '{}'::jsonb, pg_catalog.now(), pg_catalog.now()
      );

    INSERT INTO vehicle.makes (id, name, slug)
    VALUES
      ('${ids.make}', 'Seller Contact Test', 'seller-contact-${ids.make}');

    INSERT INTO vehicle.models (id, make_id, name, slug)
    VALUES ('${ids.model}', '${ids.make}', 'Seller Contact Model', 'seller-contact-${ids.model}');

    INSERT INTO vehicle.vehicle_profiles (
      id, make_id, model_id, year, mileage_km, fuel_type,
      transmission, created_source, profile_status, created_by
    ) VALUES (
      '${ids.vehicle}', '${ids.make}', '${ids.model}', 2024, 100,
      'gasoline', 'automatic', 'manual', 'active', '${ids.seller}'
    );

    INSERT INTO vehicle.profile_ownership (
      vehicle_profile_id, owner_id, ownership_type, is_current
    ) VALUES ('${ids.vehicle}', '${ids.seller}', 'owner', TRUE);

    INSERT INTO marketplace.listings (
      id, vehicle_profile_id, seller_id, status, moderation_status,
      title, price_amount, city, seller_type
    ) VALUES (
      '${ids.listing}', '${ids.vehicle}', '${ids.seller}', 'active', 'active',
      'Seller contact test', 100000, 'Istanbul', 'private'
    );

    ${check("function is SECURITY DEFINER with empty search_path", `
      EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc
        WHERE oid = '${contactSignature}'::regprocedure
          AND prosecdef
          AND proconfig @> ARRAY['search_path=""']
      )
    `)}
    ${check("signature is one UUID input and phone-only table output", `
      EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc
        WHERE oid = '${contactSignature}'::regprocedure
          AND pronargs = 1
          AND pronargdefaults = 0
          AND proargtypes = '2950'::oidvector
          AND proargnames = ARRAY['p_listing_id', 'phone']::text[]
          AND proargmodes = ARRAY['i', 't']::"char"[]
          AND proallargtypes = ARRAY[2950, 25]::oid[]
          AND proretset
      )
    `)}
    ${check("function has no overload", `
      (SELECT count(*) = 1
       FROM pg_catalog.pg_proc AS procedure
       JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
       WHERE namespace.nspname = 'public'
         AND procedure.proname = 'get_listing_seller_contact')
    `)}
    ${check("PUBLIC execute absent", `
      NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS procedure,
             LATERAL aclexplode(COALESCE(procedure.proacl, acldefault('f', procedure.proowner))) AS acl
        WHERE procedure.oid = '${contactSignature}'::regprocedure
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
    `)}
    ${check("anon execute absent", `NOT has_function_privilege('anon', '${contactSignature}', 'EXECUTE')`)}
    ${check("service role execute absent", `NOT has_function_privilege('service_role', '${contactSignature}', 'EXECUTE')`)}
    ${check("authenticated execute present", `has_function_privilege('authenticated', '${contactSignature}', 'EXECUTE')`)}
    ${check("public listing views remain phone-free", `
      NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('ff_home_listings', 'ff_listing_details', 'ff_akis_videos')
          AND column_name ILIKE '%phone%'
      )
    `)}

    ${setRole("anon")}
    ${expectError("anon execution denied", `PERFORM * FROM ${contactCall}`, "42501")}
    ${expectError("anon direct profile phone denied", `PERFORM phone FROM public.profiles WHERE id = '${ids.seller}'`, "42501")}
    ${check("guest listing browsing remains available", `EXISTS (SELECT 1 FROM public.ff_listing_details WHERE listing_id = '${ids.listing}')`)}

    ${setRole("service_role")}
    ${expectError("service role execution denied", `PERFORM * FROM ${contactCall}`, "42501")}

    ${setRole("authenticated")}
    ${expectError("authenticated role without identity is rejected", `PERFORM * FROM ${contactCall}`, "OT401")}

    ${setRole("authenticated", ids.buyer)}
    ${contact("eligible buyer receives one canonical phone by default")}
    ${check("buyer cross-profile SELECT remains blocked", `NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '${ids.seller}')`)}
    ${check("buyer own profile SELECT remains available", `EXISTS (SELECT 1 FROM public.profiles WHERE id = '${ids.buyer}')`)}
    ${check("seller UUID cannot act as listing lookup", `NOT EXISTS (SELECT 1 FROM public.get_listing_seller_contact('${ids.seller}'::uuid))`)}
    ${check("vehicle UUID cannot act as listing lookup", `NOT EXISTS (SELECT 1 FROM public.get_listing_seller_contact('${ids.vehicle}'::uuid))`)}
    ${check("nonexistent listing returns no contact", `NOT EXISTS (SELECT 1 FROM public.get_listing_seller_contact('${ids.missingListing}'::uuid))`)}
    ${check("null listing returns no contact", "NOT EXISTS (SELECT 1 FROM public.get_listing_seller_contact(NULL))")}
    ${expectError("malformed listing id is rejected by UUID contract", "PERFORM * FROM public.get_listing_seller_contact('not-a-uuid')", "22P02")}

    ${setRole("authenticated", ids.seller)}
    ${noContact("own listing returns no contact")}

    RESET ROLE;
    UPDATE public.profiles SET phone = NULL WHERE id = '${ids.seller}';
    ${setRole("authenticated", ids.buyer)}
    ${noContact("null seller phone returns no contact")}
    RESET ROLE;
    UPDATE public.profiles SET phone = '${phone}' WHERE id = '${ids.seller}';

    UPDATE identity.user_settings
    SET privacy_show_phone = FALSE
    WHERE user_id = '${ids.seller}';
    ${setRole("authenticated", ids.buyer)}
    ${contact("privacy_show_phone false does not block contact")}

    RESET ROLE;
    UPDATE identity.user_settings
    SET privacy_show_phone = TRUE
    WHERE user_id = '${ids.seller}';
    ${setRole("authenticated", ids.buyer)}
    ${contact("privacy_show_phone true does not change contact")}

    RESET ROLE;
    DELETE FROM identity.user_settings WHERE user_id = '${ids.seller}';
    ${setRole("authenticated", ids.buyer)}
    ${contact("seller user settings are not required for contact")}
    RESET ROLE;
  `;

  const listingStates = [
    ["draft", "draft", "active"],
    ["pending review", "draft", "pending_review"],
    ["rejected", "draft", "rejected"],
    ["paused", "paused", "active"],
    ["removed", "removed", "active"],
    ["archived", "removed", "archived"],
    ["sold", "sold", "active"],
    ["moderation pending", "active", "pending_review"],
    ["moderation rejected", "active", "rejected"],
    ["moderation archived", "active", "archived"]
  ];

  for (const [label, status, moderationStatus] of listingStates) {
    sql += `
      RESET ROLE;
      UPDATE marketplace.listings
      SET status = '${status}', moderation_status = '${moderationStatus}'
      WHERE id = '${ids.listing}';
      ${setRole("authenticated", ids.buyer)}
      ${noContact(`${label} listing returns no contact`)}
      ${check(`${label} listing is absent from public details`, `NOT EXISTS (
        SELECT 1 FROM public.ff_listing_details WHERE listing_id = '${ids.listing}'
      )`)}
      RESET ROLE;
      UPDATE marketplace.listings
      SET status = 'active', moderation_status = 'active'
      WHERE id = '${ids.listing}';
    `;
  }

  const eligibilityStates = [
    ["inactive vehicle profile", "vehicle.vehicle_profiles", ids.vehicle, "profile_status", "'archived'", "'active'"],
    ["inactive make", "vehicle.makes", ids.make, "is_active", "FALSE", "TRUE"],
    ["inactive model", "vehicle.models", ids.model, "is_active", "FALSE", "TRUE"],
    ["inactive parent make", "vehicle.makes", ids.make, "is_active", "FALSE", "TRUE"]
  ];

  for (const [label, table, id, column, offValue, onValue] of eligibilityStates) {
    sql += `
      RESET ROLE;
      UPDATE ${table} SET ${column} = ${offValue} WHERE id = '${id}';
      ${setRole("authenticated", ids.buyer)}
      ${noContact(`${label} returns no contact`)}
      ${check(`${label} is absent from public details`, `NOT EXISTS (
        SELECT 1 FROM public.ff_listing_details WHERE listing_id = '${ids.listing}'
      )`)}
      RESET ROLE;
      UPDATE ${table} SET ${column} = ${onValue} WHERE id = '${id}';
    `;
  }

  sql += `
    ${setRole("authenticated", ids.buyer)}
    ${contact("eligibility restoration returns contact")}

    RESET ROLE;
    ${check("profile phone canonical constraint remains validated", `EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
        AND conname = 'profiles_phone_format_chk'
        AND convalidated
    )`)}
    ${check("cross-user profile policy remains absent", `NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'profiles_select_public'
    )`)}

    SELECT test, passed FROM seller_contact_results ORDER BY test;
    ROLLBACK;
  `;

  const results = await query(sql);
  assert.equal(results.length, checks.length, "Every local DB check must execute");
  assert.deepEqual(
    results.filter((result) => !result.passed),
    [],
    `Seller contact failures: ${JSON.stringify(results.filter((result) => !result.passed), null, 2)}`
  );

  const cleanup = await query(`
    SELECT
      to_regprocedure('${contactSignature}') IS NOT NULL AS contact_function_present,
      NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id IN ('${ids.seller}', '${ids.buyer}')
      ) AS fixtures_absent;
  `);
  assert.deepEqual(cleanup, [{
    contact_function_present: true,
    fixtures_absent: true
  }]);

  console.log(`PASS seller contact local DB matrix (${results.length} checks)`);
  for (const result of results) {
    console.log(`PASS ${result.test}`);
  }
}

runtime().catch((error) => {
  console.error(redact(error.stack || error.message || error));
  process.exitCode = 1;
});
