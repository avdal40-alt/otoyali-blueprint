const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");
const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();

const serverSearch = read("src/lib/search/server-search.ts");
const searchContract = read("src/lib/search/search-contract.ts");
const vehicleCard = read("src/components/vehicle/VehicleCard.tsx");
const vehicleGrid = read("src/components/vehicle/VehicleGrid.tsx");
const migration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20261013113000_jlc0405_search_card_transparency.sql"), "utf8");

assert.match(vehicleCard, /formatDate\(listing\.published_at, activeLocale\)/, "card date must come from canonical publication data");
assert.match(vehicleCard, /formatNumber\(listing\.views_count \?\? 0, activeLocale\)/, "card must show the safe aggregate view count");
assert.match(vehicleGrid, /grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/, "card grid stays compact-safe and stable");
assert.match(searchContract, /views_count: number \| null;/, "Search v1 response contract includes the public aggregate");
assert.match(serverSearch, /views_count: listing\.views_count,/, "Search cards retain the RPC view aggregate");
assert.match(migration, /'views_count',views_count/, "Search v1 projects the aggregate into public cards");
assert.match(migration, /SECURITY INVOKER/, "Search v1 remains invoker-secured");
assert.match(migration, /JOIN marketplace\.listings listing ON listing\.id=page\.listing_id AND listing\.status='active' AND listing\.moderation_status='active'/, "aggregate is read only from active public listings");
assert.doesNotMatch(migration, /seller_id|phone|email|viewer_key|listing_view_events/, "Search card projection must not expose private analytics or identity");

const contract = query(`
  SELECT concat_ws('|',
    has_function_privilege('anon', 'marketplace.search_listings_v1(jsonb)', 'EXECUTE'),
    (SELECT NOT prosecdef FROM pg_proc WHERE oid = 'marketplace.search_listings_v1(jsonb)'::regprocedure),
    (SELECT coalesce(array_to_string(proconfig, ','), '') LIKE '%search_path=marketplace, pg_catalog%' FROM pg_proc WHERE oid = 'marketplace.search_listings_v1(jsonb)'::regprocedure),
    (SELECT array_to_string(reloptions, ',') LIKE '%security_invoker=true%' FROM pg_class WHERE oid = 'public.ff_home_listings'::regclass),
    (SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ff_home_listings' AND column_name IN ('seller_id','phone','email','viewer_key')))
  );
`).split("|");
assert.deepEqual(contract, ["t", "t", "t", "t", "t"], "public card contracts must remain aggregate-only and invoker-secured");

console.log("JLC-0405 listing-card transparency contract passed");
