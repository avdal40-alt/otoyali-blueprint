const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..", "..");

function loadTypeScript(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (request) => (Object.hasOwn(mocks, request) ? mocks[request] : originalRequire(request));
  loaded._compile(output, filename);
  return loaded.exports;
}

const searchParams = loadTypeScript("apps/web/src/lib/search/search-params.ts");
const { buildSearchRequest } = loadTypeScript("apps/web/src/lib/search/server-search.ts", {
  "@/lib/supabase/server": { getSupabaseServerClient: () => undefined, hasSupabaseEnv: () => false },
  "@/lib/media/storage-urls": { signImageStorageUrlMap: async () => new Map() },
  "./search-params": searchParams,
  "./search-service": {}
});
const { buildSearchUrl, parseSearchParams } = searchParams;

const rankedCursor = {
  version: "v1",
  sort: "newest",
  listing_id: "00000000-0000-0000-0000-000000000000",
  ranked_at: "2026-10-12T10:00:00.000Z"
};
const parsed = parseSearchParams({
  sort: "newest",
  cursor: encodeURIComponent(JSON.stringify(rankedCursor))
});
assert.deepEqual(parsed.cursor, rankedCursor, "raised-listing newest cursors survive the URL boundary");
assert.match(buildSearchUrl({ ...parsed, cursor: rankedCursor }), /ranked_at/, "ranked cursor remains pageable");

const filters = {
  ...parseSearchParams({}),
  condition: "new",
  priceMin: "1000000",
  priceMax: "2000000",
  yearMin: "2022",
  yearMax: "2025",
  mileageMax: "10000",
  fuelType: "electric,hybrid",
  transmission: "automatic",
  bodyType: "suv",
  driveType: "awd",
  color: "black",
  sellerType: "dealer",
  engineVolume: "2.0",
  onlyWithPhotos: true,
  negotiableOnly: true,
  tradeOnly: true,
  sort: "mileage_asc",
  cursor: null
};
const request = buildSearchRequest(filters, { makes: [], models: [], cities: [] });
assert.deepEqual(request, {
  version: "v1",
  limit: 24,
  sort: "mileage_asc",
  filters: {
    condition: "new",
    price_min: 1000000,
    price_max: 2000000,
    year_min: 2022,
    year_max: 2025,
    mileage_max: 10000,
    fuel_types: ["electric", "hybrid"],
    transmissions: ["automatic"],
    body_types: ["suv"],
    drive_types: ["awd"],
    colors: ["black"],
    seller_types: ["dealer"],
    engine_volume_min: 2,
    engine_volume_max: 2,
    price_negotiable: true,
    trade_in_accepted: true,
    has_photos: true
  }
}, "advanced controls use the canonical server filter contract");

const client = fs.readFileSync(path.join(root, "apps/web/src/app/search/_components/SearchClient.tsx"), "utf8");
assert.match(client, /<MobileFilterDrawer[\s\S]*?\{renderFilterPanel\(\)\}/, "mobile drawer renders the same controlled filter panel");
assert.match(client, /buildSearchUrl\(\{ \.\.\.filters, cursor: nextCursor \}\)/, "next page keeps the current filter state");
console.log("JLC-0404 advanced filter, sort, and keyset-pagination contract passed");
