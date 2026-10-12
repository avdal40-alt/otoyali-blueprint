const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const panel = fs.readFileSync(path.join(webRoot, "src/components/home/HomeVehicleSearchPanel.tsx"), "utf8");
const conditionTabs = fs.readFileSync(path.join(webRoot, "src/components/search/ConditionTabs.tsx"), "utf8");
const english = fs.readFileSync(path.join(webRoot, "src/i18n/dictionaries/en.ts"), "utf8");
const turkish = fs.readFileSync(path.join(webRoot, "src/i18n/dictionaries/tr.ts"), "utf8");

const primary = panel.slice(panel.indexOf('className="mt-5 grid gap-3'), panel.indexOf('aria-controls="home-advanced-filters"'));
const advanced = panel.slice(panel.indexOf('id="home-advanced-filters"'));

assert.match(primary, /filters\.make/, "make must be a primary search control");
assert.match(primary, /filters\.model/, "model must be a primary search control");
assert.match(primary, /filters\.priceMin/, "minimum price must be a primary search control");
assert.match(primary, /filters\.priceMax/, "maximum price must be a primary search control");
assert.doesNotMatch(primary, /filters\.year(?:Min|Max)/, "year filters must not displace quick-search controls");
assert.match(panel, /dictionary\.search\.allFilters/, "quick search must expose the All filters control");
assert.match(advanced, /filters\.yearMin/, "year minimum must remain reachable in All filters");
assert.match(advanced, /filters\.yearMax/, "year maximum must remain reachable in All filters");
assert.match(panel, /aria-expanded=\{advancedOpen\}/, "All filters must expose its expanded state");
assert.match(panel, /className="w-full"/, "quick-search actions must remain usable across compact widths");
assert.match(panel, /mt-5 w-full min-w-0 max-w-md/, "quick-search controls must fit compact containers");
assert.match(conditionTabs, /grid w-full/, "condition tabs must fit the available compact width");
assert.match(conditionTabs, /min-w-0 truncate/, "condition tabs must not cause compact-width overflow");
assert.match(english, /allFilters: "All filters"/, "English All filters copy must be available");
assert.match(turkish, /allFilters: "Tüm filtreler"/, "Turkish All filters copy must be available");

console.log("JLC-0402 quick-search contract checks passed");
