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

const client = read("src/app/search/_components/SearchClient.tsx");
const filters = read("src/components/search/SearchFilters.tsx");
const migration = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "20261012160000_jlc0403_canonical_search_count.sql"), "utf8");

assert.match(client, /buildSearchRequest\(\{ \.\.\.filters, cursor: null \}/, "the count must use the canonical current filters without pagination");
assert.match(client, /rpc\("count_search_listings_v1", \{ p_request: countRequest \}\)/, "the CTA count must use the public canonical count RPC");
assert.match(client, /setResultCount\(undefined\)/, "filter changes must clear a previous count while the new count loads");
assert.match(client, /!error && typeof data === "number"/, "RPC failures must not render a stale count");
assert.match(filters, /resultCount === undefined \? String\(dictionary\.common\.search\)/, "the CTA must omit the count while loading or unavailable");
assert.match(migration, /normalize_search_listings_v1_semantics\(p_request\)/, "count must reuse canonical request validation");
assert.match(migration, /search_listing_document_matches_v1\(v_semantics, document\)/, "count must reuse canonical matching semantics");
assert.match(migration, /SECURITY INVOKER/, "public count must remain invoker-secured");
assert.match(migration, /GRANT EXECUTE ON FUNCTION marketplace\.count_search_listings_v1\(JSONB\) TO anon, authenticated, service_role/, "public callers need only RPC execution");

const contract = runLocalSql(`
  SELECT concat_ws('|',
    has_function_privilege('anon', 'marketplace.count_search_listings_v1(jsonb)', 'EXECUTE'),
    (SELECT NOT prosecdef FROM pg_proc WHERE oid = 'marketplace.count_search_listings_v1(jsonb)'::regprocedure),
    (SELECT count(*)::text FROM marketplace.listing_search_documents),
    marketplace.count_search_listings_v1('{"version":"v1","filters":{}}'::jsonb)::text
  );
`).split("|");
assert.deepEqual(contract.slice(0, 2), ["t", "t"], "count RPC must be anonymously executable and invoker-secured");
assert.equal(contract[2], contract[3], "unfiltered count must equal the public search-document total");

console.log("JLC-0403 live canonical search count checks passed");
