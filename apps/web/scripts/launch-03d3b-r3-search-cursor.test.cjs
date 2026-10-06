const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..", "..");
const loadTypeScript = (relativePath, mocks = {}) => {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (request) => (Object.hasOwn(mocks, request) ? mocks[request] : originalRequire(request));
  loaded._compile(output, filename);
  return loaded.exports;
};

const searchParams = loadTypeScript("apps/web/src/lib/search/search-params.ts");
const { buildSearchRequest } = loadTypeScript("apps/web/src/lib/search/server-search.ts", {
  "@/lib/supabase/server": { getSupabaseServerClient: () => undefined, hasSupabaseEnv: () => false },
  "@/lib/media/storage-urls": { signImageStorageUrlMap: async () => new Map() },
  "./search-params": searchParams
});
const { parseSearchParams, buildSearchUrl } = searchParams;
const catalogs = { makes: [], models: [], cities: [] };
const validCursor = { version: "v1", sort: "newest", listing_id: "00000000-0000-0000-0000-000000000000", published_at: "2026-10-06T00:00:00.000Z" };
const baseFilters = () => parseSearchParams({});

for (const filters of [baseFilters(), { ...baseFilters(), make: "Toyota" }, { ...baseFilters(), sort: "price_asc" }]) {
  assert.equal(Object.hasOwn(buildSearchRequest(filters, catalogs), "cursor"), false, "first-page requests omit cursor");
}
assert.deepEqual(buildSearchRequest({ ...baseFilters(), cursor: validCursor }, catalogs).cursor, validCursor, "valid cursor is preserved");
for (const invalidCursor of [null, "", "null", "undefined"]) {
  assert.equal(Object.hasOwn(buildSearchRequest({ ...baseFilters(), cursor: invalidCursor }, catalogs), "cursor"), false, "non-cursor values are omitted");
}

const parsed = parseSearchParams({ cursor: encodeURIComponent(JSON.stringify(validCursor)) });
assert.deepEqual(parsed.cursor, validCursor, "PostgreSQL-compatible UUID cursor is accepted");
assert.equal(parseSearchParams({ cursor: encodeURIComponent(JSON.stringify({ ...validCursor, listing_id: "not-a-uuid" })) }).cursor, null, "malformed UUID is rejected");
assert.equal(parseSearchParams({ cursor: encodeURIComponent(JSON.stringify({ ...validCursor, unexpected: true })) }).cursor, null, "malformed cursor structure is rejected");
assert.match(buildSearchUrl({ ...baseFilters(), cursor: validCursor }), /cursor=/, "valid cursor round-trips through the URL");
for (const cursor of [
  validCursor,
  { version: "v1", sort: "price_asc", listing_id: validCursor.listing_id, price_amount: 100 },
  { version: "v1", sort: "price_desc", listing_id: validCursor.listing_id, price_amount: 100 },
  { version: "v1", sort: "year_desc", listing_id: validCursor.listing_id, year: 2024 },
  { version: "v1", sort: "mileage_asc", listing_id: validCursor.listing_id, mileage_km: 100 }
]) {
  const filters = parseSearchParams({ sort: cursor.sort, cursor: encodeURIComponent(JSON.stringify(cursor)) });
  assert.deepEqual(filters.cursor, cursor, `${cursor.sort} cursor is accepted for the next-page request`);
  assert.deepEqual(buildSearchRequest(filters, catalogs).cursor, cursor, `${cursor.sort} cursor survives the request round-trip`);
}

const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261006120000_fix_search_cursor_uuid_validation.sql"), "utf8");
assert.match(migration, /CREATE OR REPLACE FUNCTION marketplace\.search_listings_v1\(p_request JSONB\)/);
assert.match(migration, /LANGUAGE plpgsql STABLE SECURITY INVOKER/);
assert.match(migration, /SET search_path = marketplace, pg_catalog/);
assert.match(migration, /\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$/);
assert.doesNotMatch(migration, /\[1-5\]\[0-9a-f\]\{3\}-\[89ab\]/i, "RFC version and variant restrictions are removed");
assert.match(migration, /RAISE EXCEPTION 'search cursor is invalid'/);
assert.match(migration, /REVOKE ALL ON FUNCTION marketplace\.search_listings_v1\(JSONB\) FROM PUBLIC, anon, authenticated, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION marketplace\.search_listings_v1\(JSONB\) TO anon, authenticated, service_role/);
const existingMigration = fs.readFileSync(path.join(root, "supabase/migrations/20260921130917_functional_03b_b0_a2_shared_search_v1_semantic_core.sql"), "utf8");
const functionDefinition = (value) => value.slice(value.indexOf("CREATE OR REPLACE FUNCTION marketplace.search_listings_v1"), value.indexOf("$$;", value.indexOf("CREATE OR REPLACE FUNCTION marketplace.search_listings_v1")) + 3);
const expectedForwardDefinition = functionDefinition(existingMigration).replace("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
assert.equal(functionDefinition(migration), expectedForwardDefinition, "the forward function changes only the UUID version/variant restriction");
console.log("LAUNCH-03D3B-R3 search cursor forward-fix contract passed");
