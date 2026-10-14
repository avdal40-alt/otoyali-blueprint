const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");
const sql = (statement) => childProcess.execFileSync(
  "docker",
  ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
  { encoding: "utf8" },
).trim();

const mediaQueries = read("src/lib/queries/media.ts");
const listingPage = read("src/app/listing/[id]/page.tsx");
const searchRequest = read("src/lib/search/search-request.ts");
const searchMigration = fs.readFileSync(
  path.join(repoRoot, "supabase", "migrations", "20261013113000_jlc0405_search_card_transparency.sql"),
  "utf8",
);

assert.match(mediaQueries, /const MAX_LISTING_MEDIA = 20/, "listing gallery cap must remain explicit");
assert.match(mediaQueries, /getListingMedia[\s\S]*?\.limit\(MAX_LISTING_MEDIA\)/, "listing-detail media read must be bounded");
assert.match(mediaQueries, /getListingMediaByVehicleProfileId[\s\S]*?\.limit\(MAX_LISTING_MEDIA\)/, "fallback gallery read must be bounded");
assert.match(listingPage, /Promise\.all\(\[[\s\S]*?getListingDetails[\s\S]*?getListingMedia[\s\S]*?getHomeListingById[\s\S]*?getHomeListings\(12\)[\s\S]*?getListingVideos\(resolvedParams\.id, 3\)[\s\S]*?getListingReviewTarget/, "listing-detail independent reads must stay concurrent");
assert.match(searchRequest, /limit: 24/, "Search v1 client request remains bounded to 24 cards");
assert.match(searchMigration, /LIMIT v_limit/, "Search v1 keeps server-side keyset page bounds");
assert.match(searchMigration, /views_count/, "search card view counts remain sourced without an N+1 client read");

const indexes = sql("SELECT string_agg(indexname, ',' ORDER BY indexname) FROM pg_indexes WHERE (schemaname, tablename) IN (('marketplace', 'listing_search_documents'), ('vehicle', 'profile_media'))");
assert.match(indexes, /listing_search_documents_freshness_keyset_idx/, "local Search v1 freshness keyset index must exist");
assert.match(indexes, /profile_media_cover_order_idx/, "local listing-media order index must exist");

// The local table can be empty. Disable the competing index-only path so this
// structural check proves the exact expression index can satisfy the order.
const freshnessPlan = sql("SET enable_seqscan = off; SET enable_indexonlyscan = off; EXPLAIN (COSTS OFF) SELECT listing_id FROM marketplace.listing_search_documents ORDER BY COALESCE(raised_at, published_at, 'epoch'::timestamptz) DESC, listing_id ASC LIMIT 24");
assert.match(freshnessPlan, /Index Scan using listing_search_documents_freshness_keyset_idx/, "forced local newest-page plan must use the exact freshness keyset index");
assert.doesNotMatch(freshnessPlan, /Sort/, "freshness keyset index must avoid a separate newest-page sort");

console.log("JLC-1402 local query and index audit regression checks passed");
