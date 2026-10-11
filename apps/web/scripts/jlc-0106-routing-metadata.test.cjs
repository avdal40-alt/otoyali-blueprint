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
const metadata = loadTypeScriptModule(read("src", "lib", "seo", "metadata.ts"), "metadata.ts", {
  "@/lib/market": market
});
const metadataSource = read("src", "lib", "seo", "metadata.ts");
const layoutSource = read("src", "app", "layout.tsx");
const sitemapSource = read("src", "app", "sitemap.ts");
const robotsSource = read("src", "app", "robots.ts");

const turkey = market.MARKET_PROFILES.yolmodTurkey;
const kazakhstan = market.MARKET_PROFILES.jolcarKazakhstan;

assert.equal(metadata.getPublicSiteUrl(turkey), "https://yolmod.com");
assert.equal(metadata.getPublicSiteUrl(kazakhstan), null);
assert.equal(metadata.absoluteUrl("search", turkey), "https://yolmod.com/search");
assert.equal(metadata.absoluteUrl("/search", kazakhstan), undefined);
assert.equal(metadata.getMetadataBase(kazakhstan), undefined);

const plannedMetadata = metadata.buildSeoMetadata({
  title: "Search",
  description: "Find vehicles",
  path: "/search",
  alternates: { en: "/en/search" },
  profile: kazakhstan
});
assert.equal(plannedMetadata.alternates.canonical, "/search");
assert.equal(plannedMetadata.alternates.languages.en, "/en/search");
assert.equal(plannedMetadata.openGraph.url, undefined);
assert.equal(plannedMetadata.openGraph.siteName, "Jolcar");
assert.equal(plannedMetadata.openGraph.locale, "kk_KZ");

assert.doesNotMatch(metadataSource, /https:\/\/yolmod\.com|tr_TR|Yolmod/);
assert.match(layoutSource, /getMetadataBase\(\)/);
assert.match(layoutSource, /getPublicSiteUrl\(\)/);
assert.match(sitemapSource, /if \(!siteUrl\) return \[\]/);
assert.match(robotsSource, /siteUrl \? \{ sitemap:/);

console.log("JLC-0106 routing and metadata tests passed.");
