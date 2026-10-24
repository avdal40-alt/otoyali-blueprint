const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

function loadTypeScriptModule(source, fileName) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, require);
  return module.exports;
}

const market = loadTypeScriptModule(read("src", "lib", "market.ts"), "market.ts");
const sitemap = read("src", "app", "sitemap.ts");
const robots = read("src", "app", "robots.ts");

const turkey = market.getMarketSeoRouteConfig(market.MARKET_PROFILES.yolmodTurkey);
const kazakhstan = market.getMarketSeoRouteConfig(market.MARKET_PROFILES.jolcarKazakhstan);

assert.equal(turkey.locales.length, 2);
assert.deepEqual(turkey.locales[0].staticPaths.slice(0, 2), ["/", "/search"]);
assert.deepEqual(turkey.locales[1].staticPaths.slice(0, 2), ["/en", "/en/search"]);
assert.deepEqual(kazakhstan.locales.map((locale) => locale.locale), ["ru", "kk", "en", "zh-CN"], "Kazakhstan must publish only its four launch locale families");
assert.deepEqual(kazakhstan.locales[0].staticPaths.slice(0, 2), ["/", "/search"], "Russian must be the unprefixed Kazakhstan canonical route family");
assert.deepEqual(kazakhstan.locales[1].staticPaths.slice(0, 2), ["/kk", "/kk/search"]);
assert.deepEqual(kazakhstan.locales[2].staticPaths.slice(0, 2), ["/en", "/en/search"]);
assert.deepEqual(kazakhstan.locales[3].staticPaths.slice(0, 2), ["/zh-CN", "/zh-CN/search"]);
assert.ok(kazakhstan.locales.every((locale) => !locale.staticPaths.some((route) => route.includes("ikinci-el-araba") || route.includes("used-cars"))), "Kazakhstan sitemap routes must not borrow Turkey route families");
assert.match(sitemap, /getMarketSeoRouteConfig\(ACTIVE_MARKET_PROFILE\)/);
assert.match(robots, /getMarketSeoRouteConfig\(ACTIVE_MARKET_PROFILE\)/);
assert.doesNotMatch(sitemap, /ikinci-el-araba|used-cars|\/marka\/|\/sehir\//);
assert.doesNotMatch(robots, /ikinci-el-araba|used-cars|\/marka\/|\/sehir\//);
assert.match(sitemap, /if \(!siteUrl\) return \[\]/);
assert.match(robots, /siteUrl \? \{ sitemap:/);

console.log("JLC-1201 country-aware SEO route tests passed.");
