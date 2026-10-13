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
assert.equal(kazakhstan.locales.length, 0, "a hostless planned market must not publish another market's routes");
assert.match(sitemap, /getMarketSeoRouteConfig\(ACTIVE_MARKET_PROFILE\)/);
assert.match(robots, /getMarketSeoRouteConfig\(ACTIVE_MARKET_PROFILE\)/);
assert.doesNotMatch(sitemap, /ikinci-el-araba|used-cars|\/marka\/|\/sehir\//);
assert.doesNotMatch(robots, /ikinci-el-araba|used-cars|\/marka\/|\/sehir\//);
assert.match(sitemap, /if \(!siteUrl\) return \[\]/);
assert.match(robots, /siteUrl \? \{ sitemap:/);

console.log("JLC-1201 country-aware SEO route tests passed.");
