const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");
const runLocalSql = (sql) => childProcess.execFileSync(
  "docker",
  ["exec", "supabase_db_Otoyali-blueprint", "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
  { encoding: "utf8" }
).trim();

const listingPage = read("src/app/listing/[id]/page.tsx");
const dealerPage = read("src/app/dealer/[id]/page.tsx");
const searchRuntime = read("src/lib/search/server-search.ts");
const searchRequest = read("src/lib/search/search-request.ts");
const migration = fs.readFileSync(
  path.join(repoRoot, "supabase", "migrations", "20261013160000_jlc1204_search_freshness_expression_index.sql"),
  "utf8"
);

assert.match(searchRequest, /limit: 24/, "Search v1 must retain its bounded 24-card page");
assert.match(listingPage, /getHomeListings\(12\)/, "listing detail recommendations must remain bounded");
assert.match(listingPage, /getListingVideos\(resolvedParams\.id, 3\)/, "listing detail video reads must remain bounded");
assert.match(listingPage, /const \[detailsResult, mediaResult, fallbackListingResult, similarResult, videosResult, reviewTargetResult\] = await Promise\.all\(/, "independent listing reads must start concurrently");
assert.match(dealerPage, /\.limit\(24\)/, "dealer stock must remain bounded");
assert.match(migration, /COALESCE\(raised_at, published_at, 'epoch'::TIMESTAMPTZ\)/, "freshness index must match the public newest rank expression");

const planOutput = runLocalSql(`
  SELECT indexdef
  FROM pg_indexes
  WHERE schemaname = 'marketplace'
    AND indexname = 'listing_search_documents_freshness_keyset_idx';
  SET enable_seqscan = off;
  EXPLAIN (COSTS OFF)
  SELECT listing_id
  FROM marketplace.listing_search_documents
  ORDER BY COALESCE(raised_at, published_at, 'epoch'::timestamptz) DESC, listing_id ASC
  LIMIT 24;
`).split(/\r?\n/).filter(Boolean);
const [indexDefinition, ...planLines] = planOutput;
const plan = planLines.join("\n");

assert.match(indexDefinition ?? "", /COALESCE\(raised_at, published_at, '1970-01-01 00:00:00\+00'::timestamp with time zone\)/, "physical freshness index must exist locally");
assert.match(plan ?? "", /Index Scan using listing_search_documents_freshness_keyset_idx/, "newest keyset plan must use the matching index when sequential scans are disabled");
assert.doesNotMatch(plan ?? "", /Sort/, "matching freshness index must remove the explicit sort from the bounded newest plan");

console.log("JLC-1204 local performance sanity checks passed");
