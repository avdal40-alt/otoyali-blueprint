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
const kzMetadata = loadTypeScriptModule(read("src", "lib", "seo", "kz-launch-metadata.ts"), "kz-launch-metadata.ts", {
  "@/lib/market": market
});
const metadataSource = read("src", "lib", "seo", "metadata.ts");
const kzMetadataSource = read("src", "lib", "seo", "kz-launch-metadata.ts");
const layoutSource = read("src", "app", "layout.tsx");
const sitemapSource = read("src", "app", "sitemap.ts");
const robotsSource = read("src", "app", "robots.ts");

const turkey = market.MARKET_PROFILES.yolmodTurkey;
const kazakhstan = market.MARKET_PROFILES.jolcarKazakhstan;

assert.equal(metadata.getPublicSiteUrl(turkey), "https://yolmod.com");
assert.equal(metadata.getPublicSiteUrl(kazakhstan), "https://jolcar.vercel.app");
assert.equal(metadata.absoluteUrl("search", turkey), "https://yolmod.com/search");
assert.equal(metadata.absoluteUrl("/search", kazakhstan), "https://jolcar.vercel.app/search");
assert.equal(metadata.getMetadataBase(kazakhstan).href, "https://jolcar.vercel.app/");

const plannedMetadata = metadata.buildSeoMetadata({
  title: "Search",
  description: "Find vehicles",
  path: "/search",
  alternates: { en: "/en/search" },
  profile: kazakhstan
});
assert.equal(plannedMetadata.alternates.canonical, "https://jolcar.vercel.app/search");
assert.equal(plannedMetadata.alternates.languages.en, "https://jolcar.vercel.app/en/search");
assert.equal(plannedMetadata.openGraph.url, "https://jolcar.vercel.app/search");
assert.equal(plannedMetadata.openGraph.siteName, "Jolmod");
assert.equal(plannedMetadata.openGraph.locale, "ru_KZ");

assert.deepEqual(metadata.getMarketLocaleAlternatePaths("/search", kazakhstan), {
  ru: "/search",
  kk: "/kk/search",
  en: "/en/search",
  "zh-CN": "/zh-CN/search"
});
assert.deepEqual(metadata.getMarketLocaleAlternatePaths("/zh-CN/search", kazakhstan), {
  ru: "/search",
  kk: "/kk/search",
  en: "/en/search",
  "zh-CN": "/zh-CN/search"
});
assert.equal(kzMetadata.getKzLaunchMetadata("ru").title, "Автомобильный маркетплейс Казахстана");
assert.equal(kzMetadata.getKzLaunchMetadata("kk").openGraphLocale, "kk_KZ");
assert.equal(kzMetadata.getKzLaunchMetadata("en").openGraphLocale, "en_KZ");
assert.equal(kzMetadata.getKzLaunchMetadata("zh-CN").openGraphLocale, "zh_CN");
assert.equal(kzMetadata.getKzLaunchMetadata("unsupported").openGraphLocale, "ru_KZ", "Russian must be the KZ metadata fallback");
assert.match(kzMetadata.getKzLaunchMetadata("zh-CN").title, /[\u4E00-\u9FFF]/, "Chinese metadata must use Simplified Chinese source text");
assert.doesNotMatch(kzMetadataSource, /[\uFFFD□]|\?{2,}|\b(?:todo|tbd)\b|關|體|臺/i, "Chinese metadata source must not contain corruption, placeholders, or Traditional Chinese");

assert.doesNotMatch(metadataSource, /https:\/\/yolmod\.com|tr_TR|Yolmod/);
assert.match(layoutSource, /getMetadataBase\(\)/);
assert.match(layoutSource, /getPublicSiteUrl\(\)/);
assert.match(sitemapSource, /if \(!siteUrl\) return \[\]/);
assert.match(robotsSource, /siteUrl \? \{ sitemap:/);

console.log("JLC-0106 routing and metadata tests passed.");
