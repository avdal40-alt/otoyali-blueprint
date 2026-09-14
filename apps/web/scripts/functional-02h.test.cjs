const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260914134514_functional_02h_excel_import_service_boundary.sql"), "utf8");
const parser = fs.readFileSync(path.join(root, "apps/web/src/lib/marketplace/excel-import-server.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/web/src/app/api/dealer/import/excel/route.ts"), "utf8");

for (const expected of ["public.is_verified_galeri", "dealer_import_batches", "dealer_listing_external_ids", "status = 'draft'", "moderation_status = 'pending_review'", "REVOKE ALL", "GRANT EXECUTE"]) assert.ok(migration.includes(expected), expected);
for (const expected of ["import \"server-only\"", "Open.buffer", "maxUploadBytes", "maxZipEntries", "maxExpandedBytes", "maxCompressionRatio", "xl/vbaProject.bin", "readSheet", "allowedHeaders", "requiredUpsertHeaders"]) assert.ok(parser.includes(expected), expected);
assert.doesNotMatch(parser, /extract\s*\(/i);
assert.match(route, /apply_own_verified_galeri_excel_import/);
assert.doesNotMatch(route, /service_role/i);

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim();
const owner = "00000000-0000-0000-0000-000000000201";
const other = "00000000-0000-0000-0000-000000000202";
const makeModel = query("SELECT ma.slug || '|' || mo.slug FROM vehicle.makes ma JOIN vehicle.models mo ON mo.make_id=ma.id WHERE ma.is_active AND mo.is_active ORDER BY ma.slug,mo.slug LIMIT 1").split("|");
assert.equal(makeModel.length, 2);
const row = (id) => JSON.stringify([{ external_listing_id: id, operation: "upsert", make_slug: makeModel[0], model_slug: makeModel[1], year: "2020", mileage_km: "12000", fuel_type: "gasoline", transmission: "automatic", title: "Test listing", price_amount: "100000", city: "Ankara" }]).replace(/'/g, "''");

assert.throws(() => query("BEGIN; SET LOCAL ROLE anon; SELECT * FROM public.apply_own_verified_galeri_excel_import(repeat('a',64), '[]'); ROLLBACK;"), /permission denied/i, "anon denied");
assert.throws(() => query(`BEGIN; INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES ('${owner}','authenticated','authenticated','h-owner@example.test','{}','{}',now(),now()); SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${owner}',true); SELECT * FROM public.apply_own_verified_galeri_excel_import(repeat('a',64),'${row("ordinary")}'::jsonb); ROLLBACK;`), /verified Galeri required/i, "ordinary user denied");

const exercise = `
BEGIN;
INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
('${owner}','authenticated','authenticated','h-owner@example.test','{}','{}',now(),now()), ('${other}','authenticated','authenticated','h-other@example.test','{}','{}',now(),now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type='dealer' WHERE id IN ('${owner}','${other}');
INSERT INTO marketplace.galeri_verifications (dealer_id,status,reviewed_at,reviewed_by) VALUES ('${owner}','verified',now(),'${owner}'),('${other}','verified',now(),'${other}');
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${owner}',true);
SELECT row_number || '|' || status || '|' || external_listing_id FROM public.apply_own_verified_galeri_excel_import(repeat('b',64),'${row("same-id")}'::jsonb);
SELECT row_number || '|' || status || '|' || external_listing_id FROM public.apply_own_verified_galeri_excel_import(repeat('b',64),'${row("same-id")}'::jsonb);
SELECT set_config('request.jwt.claim.sub','${other}',true);
SELECT row_number || '|' || status || '|' || external_listing_id FROM public.apply_own_verified_galeri_excel_import(repeat('c',64),'${row("same-id")}'::jsonb);
SET LOCAL ROLE service_role; SELECT count(*) FROM marketplace.dealer_listing_external_ids WHERE external_listing_id='same-id';
ROLLBACK;`;
assert.equal(query(exercise).split("\n").filter((line) => line === "2" || line === "1|applied|same-id").join("\n"), "1|applied|same-id\n1|applied|same-id\n1|applied|same-id\n2", "verified dealers are isolated and retries are idempotent");
console.log("FUNCTIONAL-02H Excel import service boundary passed");
