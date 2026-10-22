const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const filename = path.join(root, "src", "lib", "search", "filter-listings.ts");
const source = fs.readFileSync(filename, "utf8");

assert.doesNotMatch(source, /tr-TR|localeCompare\([^)]*,\s*["']tr["']\)/);

const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loadedModule = new Module(filename);
loadedModule.filename = filename;
loadedModule.paths = Module._nodeModulePaths(path.dirname(filename));
const load = Module._load;
Module._load = (request, parent, isMain) => {
  if (request === "@/lib/format") return { cityLabel: (city) => city ?? "" };
  if (request === "./search-params") return { selectedValues: (value) => value ? value.split(",") : [] };
  return load(request, parent, isMain);
};
try {
  loadedModule._compile(compiled, filename);
} finally {
  Module._load = load;
}

const listing = {
  id: "listing-1",
  title: "Көлік Өскемен",
  make_name: "Toyota",
  model_name: "Camry",
  city: "Өскемен",
  price_amount: 1000000,
  year: 2020,
  mileage_km: 50000,
  published_at: "2026-10-01T00:00:00.000Z",
};
const filters = { q: "ӨСКЕМЕН", make: "", model: "", city: "", priceMin: "", priceMax: "", yearMin: "", yearMax: "", mileageMax: "", fuelType: "", transmission: "", bodyType: "", driveType: "", color: "", condition: "", sellerType: "", engineVolume: "", damageState: "", ownerCount: "", onlyWithPhotos: false, negotiableOnly: false, promotedOnly: false, tradeOnly: false, advanced: false, sort: "newest" };
assert.deepEqual(loadedModule.exports.filterListings([listing], filters), [listing]);

console.log("JLC-0523 search normalization contract passed");
