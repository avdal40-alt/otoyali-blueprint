const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

function loadTypeScriptModule(source, fileName, dependencies = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
  const module = { exports: {} };
  const localRequire = (request) => dependencies[request] ?? require(request);
  new Function("exports", "module", "require", output)(module.exports, module, localRequire);
  return module.exports;
}

const market = loadTypeScriptModule(read("src", "lib", "market.ts"), "market.ts");
const location = loadTypeScriptModule(read("src", "lib", "location.ts"), "location.ts", {
  "@/lib/market": market
});
const metadata = loadTypeScriptModule(read("src", "lib", "seo", "metadata.ts"), "metadata.ts", {
  "@/lib/market": market
});

const turkey = market.MARKET_PROFILES.yolmodTurkey;
const kazakhstan = market.MARKET_PROFILES.jolcarKazakhstan;

assert.equal(market.getMarketProfile().status, "available");
assert.equal(market.getMarketProfile("yolmodTurkey").profile, turkey);
assert.equal(market.getMarketProfile("jolcarKazakhstan").profile, kazakhstan);
for (const invalidKey of [null, "", "unknown-market"]) {
  assert.deepEqual(market.getMarketProfile(invalidKey), {
    status: "unavailable",
    error: "MARKET_PROFILE_UNAVAILABLE",
    reason: "market-profile-not-configured"
  });
}

assert.equal(location.getLocationDataset("yolmodTurkey").status, "available");
assert.equal(location.getLocationDataset("jolcarKazakhstan").status, "available");
assert.deepEqual(location.getLocationDataset("unknown-market"), {
  status: "unavailable",
  error: "LOCATION_DATASET_UNAVAILABLE",
  reason: "country-location-dataset-not-configured"
});

for (const profile of [turkey, kazakhstan]) {
  const metadataResult = metadata.buildSeoMetadata({
    title: "Shared contract",
    description: "Public metadata remains profile-driven",
    path: "/search",
    profile
  });
  assert.equal(metadataResult.openGraph.siteName, profile.brandName);
  assert.equal(metadataResult.openGraph.locale, profile.metadata.defaultLocale);
  assert.equal(metadataResult.alternates.canonical, metadata.absoluteUrl("/search", profile) ?? "/search");
}

const sharedBoundarySources = [
  "src/lib/seo/metadata.ts",
  "src/app/layout.tsx",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/lib/queries/cities.ts"
];
for (const fileName of sharedBoundarySources) {
  const source = read(...fileName.split("/"));
  assert.match(source, /@\/lib\/market/, `${fileName} must use the market boundary`);
  assert.doesNotMatch(source, /https:\/\/yolmod\.com|\+90|\bTRY\b|turkey_seller_contact/i, `${fileName} must not restore a Turkey-only shared assumption`);
}

console.log("JLC-0107 multi-country regression guard suite passed.");
