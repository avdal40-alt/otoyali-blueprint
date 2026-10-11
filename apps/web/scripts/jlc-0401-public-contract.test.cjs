const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");
const runLocalSql = (sql) =>
  childProcess.execFileSync(
    "docker",
    ["exec", "supabase_db_Otoyali-blueprint", "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" }
  ).trim();

const serverSearch = read("src/lib/search/server-search.ts");
const listingsQuery = read("src/lib/queries/listings.ts");
const searchClient = read("src/app/search/_components/SearchClient.tsx");
const vehicleCard = read("src/components/vehicle/VehicleCard.tsx");
const vehicleGrid = read("src/components/vehicle/VehicleGrid.tsx");
const publicSources = [serverSearch, listingsQuery, searchClient, vehicleCard, vehicleGrid].join("\n");

assert.match(serverSearch, /schema\("marketplace"\)\.rpc\("search_listings_v1"/);
assert.doesNotMatch(serverSearch, /\.from\(/, "search must use the canonical public RPC");
assert.match(listingsQuery, /from\("ff_home_listings"\)/);
assert.match(listingsQuery, /from\("ff_listing_details"\)/);
assert.doesNotMatch(listingsQuery, /from\("listings"\)/, "public listing reads must not bypass the public views");
assert.doesNotMatch(publicSources, /\+90|\bTRY\b|Türkiye|Turkey|İstanbul|Ankara/i, "public browse/search/detail source must not hardcode a Turkey market assumption");
assert.match(searchClient, /dictionary\.search\.advancedFilters/);
assert.match(searchClient, /dictionary\.search\.nextResults/);
assert.match(vehicleCard, /dictionary\.listing\.previousPhoto/);
assert.match(vehicleCard, /dictionary\.listing\.nextPhoto/);
assert.match(vehicleCard, /dictionary\.listing\.publishedAt/);
assert.match(vehicleCard, /dictionary\.listing\.views/);
assert.match(vehicleGrid, /dictionary\.common\.publishListing/);

const forbiddenColumns = new Set(["seller_id", "user_id", "phone", "phone_number", "contact_id", "seller_contact_id", "email", "auth_user_id"]);
const columns = JSON.parse(runLocalSql(`
  SELECT json_object_agg(table_name, columns)
  FROM (
    SELECT table_name, json_agg(column_name ORDER BY ordinal_position) AS columns
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('ff_home_listings', 'ff_listing_details')
    GROUP BY table_name
  ) AS public_columns;
`));
assert.deepEqual(Object.keys(columns).sort(), ["ff_home_listings", "ff_listing_details"]);
for (const [viewName, viewColumns] of Object.entries(columns)) {
  for (const column of viewColumns) assert.equal(forbiddenColumns.has(column), false, `${viewName} must not expose ${column}`);
}

const contract = runLocalSql(`
  SELECT concat_ws('|',
    (SELECT coalesce(array_to_string(reloptions, ','), '') LIKE '%security_invoker=true%' FROM pg_class WHERE oid = 'public.ff_home_listings'::regclass),
    (SELECT coalesce(array_to_string(reloptions, ','), '') LIKE '%security_invoker=true%' FROM pg_class WHERE oid = 'public.ff_listing_details'::regclass),
    has_table_privilege('anon', 'public.ff_home_listings', 'SELECT'),
    has_table_privilege('anon', 'public.ff_listing_details', 'SELECT'),
    has_function_privilege('anon', 'marketplace.search_listings_v1(jsonb)', 'EXECUTE'),
    (SELECT NOT prosecdef FROM pg_proc WHERE oid = 'marketplace.search_listings_v1(jsonb)'::regprocedure),
    (SELECT coalesce(array_to_string(proconfig, ','), '') LIKE '%search_path=marketplace, pg_catalog%' FROM pg_proc WHERE oid = 'marketplace.search_listings_v1(jsonb)'::regprocedure)
  );
`).split("|");
assert.deepEqual(contract, ["t", "t", "t", "t", "t", "t", "t"], "local public contracts must retain invoker/RPC authorization boundaries");

const privacyMigration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20261007164752_hide_seller_identity_from_public_listing_details.sql"), "utf8");
const privacyViewDefinition = privacyMigration.slice(
  privacyMigration.indexOf("CREATE VIEW public.ff_listing_details"),
  privacyMigration.indexOf("COMMENT ON VIEW public.ff_listing_details")
);
assert.match(privacyMigration, /WITH \(security_invoker = true\)/);
assert.doesNotMatch(privacyViewDefinition, /seller_id/, "public listing-detail migration must not project seller ownership IDs");

console.log("JLC-0401 public browse/search/detail contract passed");
