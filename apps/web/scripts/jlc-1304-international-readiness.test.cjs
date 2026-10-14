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

assert.deepEqual(kazakhstan.launchLocales, ["kk-KZ", "ru-KZ", "en"]);
assert.equal(kazakhstan.currencyCode, "KZT");
assert.equal(kazakhstan.defaultPhoneCountry, "KZ");
assert.equal(kazakhstan.metadata.defaultLocale, "kk_KZ");
assert.equal(kazakhstan.siteUrl, null, "The deferred Jolcar host must not be fabricated.");
assert.deepEqual(turkey.launchLocales, ["tr", "en"]);

for (const profile of [turkey, kazakhstan]) {
  assert.equal(location.getLocationDataset(profile === turkey ? "yolmodTurkey" : "jolcarKazakhstan").status, "available");
  const result = metadata.buildSeoMetadata({ title: "Shared contract", description: "Profile driven", path: "/search", profile });
  assert.equal(result.openGraph.siteName, profile.brandName);
  assert.equal(result.openGraph.locale, profile.metadata.defaultLocale);
}

const sharedCoreFiles = [
  "src/lib/format.ts",
  "src/lib/location.ts",
  "src/lib/queries/cities.ts",
  "src/lib/seo/metadata.ts"
];
for (const fileName of sharedCoreFiles) {
  const source = read(...fileName.split("/"));
  assert.match(source, /@\/lib\/market/, `${fileName} must receive market behavior through the market boundary`);
  assert.doesNotMatch(source, /https:\/\/yolmod\.com|\+90|turkey_seller_contact/i, `${fileName} must not hardcode a country value`);
}

console.log("JLC-1304 international-readiness regression passed.");
