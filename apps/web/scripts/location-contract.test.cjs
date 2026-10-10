const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
function load(source, fileName, requireModule = require) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, requireModule);
  return module.exports;
}

const market = load(read("src", "lib", "market.ts"), "market.ts");
const location = load(read("src", "lib", "location.ts"), "location.ts", (request) => {
  if (request === "@/lib/market") return market;
  return require(request);
});
const formatSource = read("src", "lib", "format.ts");
const drawerSource = read("src", "components", "search", "FilterDrawer.tsx");
const searchParamsSource = read("src", "lib", "search", "search-params.ts");
const listingWriteSource = read("src", "lib", "listings", "server-write.ts");

assert.deepEqual(location.getLocationDataset("jolcarKazakhstan"), {
  status: "unavailable",
  error: "LOCATION_DATASET_UNAVAILABLE",
  reason: "approved-country-city-source-required"
});
assert.deepEqual(location.getPreferredCityNames("jolcarKazakhstan"), []);
assert.equal(location.getCityLabel("Almaty", "jolcarKazakhstan"), "Almaty");
assert.equal(location.getCityLabel("Istanbul", "yolmodTurkey"), "İstanbul");
assert.match(formatSource, /getCityLabel/);
assert.match(drawerSource, /getLocationDataset/);
assert.doesNotMatch(drawerSource, /Istanbul|Ankara|Izmir|Antalya/);
assert.match(searchParamsSource, /LocationIdentifier/);
assert.match(listingWriteSource, /locationNameSchema/);
console.log("Location contract tests passed.");
