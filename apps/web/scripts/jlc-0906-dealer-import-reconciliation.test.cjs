const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim().split("\n");
const owner = "00000000-0000-0000-0000-000000009061";
const other = "00000000-0000-0000-0000-000000009062";
const [makeSlug, modelSlug] = query("SELECT ma.slug || '|' || mo.slug FROM vehicle.makes ma JOIN vehicle.models mo ON mo.make_id = ma.id WHERE ma.is_active AND mo.is_active ORDER BY ma.slug, mo.slug LIMIT 1")[0].split("|");

const row = (externalId, values = {}) => JSON.stringify([{
  external_listing_id: externalId,
  operation: values.operation ?? "upsert",
  make_slug: values.makeSlug ?? makeSlug,
  model_slug: values.modelSlug ?? modelSlug,
  year: values.year ?? "2020",
  mileage_km: values.mileage ?? "12000",
  fuel_type: values.fuel ?? "gasoline",
  transmission: values.transmission ?? "automatic",
  title: values.title ?? "Imported stock",
  price_amount: values.price ?? "100000",
  city: values.city ?? "Almaty"
}]).replace(/'/g, "''");

const output = query(`
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
  ('${owner}', 'authenticated', 'authenticated', 'jlc0906-owner@example.test', '{}', '{}', now(), now()),
  ('${other}', 'authenticated', 'authenticated', 'jlc0906-other@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type = 'dealer' WHERE id IN ('${owner}', '${other}');
INSERT INTO marketplace.galeri_verifications (dealer_id, status, reviewed_at, reviewed_by) VALUES
  ('${owner}', 'verified', now(), '${owner}'), ('${other}', 'verified', now(), '${other}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${owner}', true);
SELECT row_number || '|' || status || '|' || external_listing_id
  FROM public.apply_own_verified_galeri_excel_import(repeat('a', 64), '${row("stock-1")}'::jsonb);
SELECT row_number || '|' || status || '|' || external_listing_id
  FROM public.apply_own_verified_galeri_excel_import(repeat('b', 64), '${row("stock-1", { year: "2021", mileage: "13000", price: "110000", title: "Updated imported stock", city: "Astana" })}'::jsonb);
SELECT l.title || '|' || l.price_amount || '|' || l.city || '|' || vp.year || '|' || vp.mileage_km || '|' || l.status || '|' || l.moderation_status
  FROM marketplace.dealer_listing_external_ids dlei
  JOIN marketplace.listings l ON l.id = dlei.listing_id
  JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
  WHERE dlei.dealer_id = '${owner}' AND dlei.source = 'excel' AND dlei.external_listing_id = 'stock-1';
SELECT count(*) FROM marketplace.dealer_listing_external_ids
  WHERE dealer_id = '${owner}' AND source = 'excel' AND external_listing_id = 'stock-1';
SELECT row_number || '|' || status || '|' || error_code
  FROM public.apply_own_verified_galeri_excel_import(repeat('c', 64), '${row("bad-catalog", { makeSlug: "missing-make", modelSlug: "missing-model" })}'::jsonb);
SELECT count(*) || '|' || min(i.error_code)
  FROM marketplace.dealer_import_issues i
  JOIN marketplace.dealer_import_rows r ON r.id = i.import_row_id
  JOIN marketplace.dealer_import_batches b ON b.id = r.batch_id
  WHERE b.dealer_id = '${owner}' AND r.external_listing_id = 'bad-catalog';
SELECT row_number || '|' || status || '|' || external_listing_id
  FROM public.apply_own_verified_galeri_excel_import(repeat('d', 64), '${row("stock-1", { operation: "archive" })}'::jsonb);
SELECT l.status || '|' || (dlei.last_seen_batch_id IS NOT NULL)
  FROM marketplace.dealer_listing_external_ids dlei
  JOIN marketplace.listings l ON l.id = dlei.listing_id
  WHERE dlei.dealer_id = '${owner}' AND dlei.source = 'excel' AND dlei.external_listing_id = 'stock-1';
SELECT set_config('request.jwt.claim.sub', '${other}', true);
SELECT row_number || '|' || status || '|' || external_listing_id
  FROM public.apply_own_verified_galeri_excel_import(repeat('e', 64), '${row("stock-1")}'::jsonb);
SET LOCAL ROLE service_role;
SELECT count(*) FROM marketplace.dealer_listing_external_ids WHERE source = 'excel' AND external_listing_id = 'stock-1';
ROLLBACK;
`);

for (const expected of [
  "1|applied|stock-1",
  "Updated imported stock|110000|Astana|2021|13000|draft|pending_review",
  "1|unknown_vehicle_catalog",
  "1|archived|stock-1",
  "removed|true",
  "2"
]) assert.ok(output.includes(expected), `missing expected reconciliation result: ${expected}`);

const privileges = query("SELECT has_function_privilege('anon', 'public.apply_own_verified_galeri_excel_import(text,jsonb)', 'EXECUTE') || '|' || has_function_privilege('authenticated', 'public.apply_own_verified_galeri_excel_import(text,jsonb)', 'EXECUTE')")[0];
assert.equal(privileges, "false|true", "only authenticated verified dealers receive the import boundary");
console.log("JLC-0906 dealer import reconciliation passed");
