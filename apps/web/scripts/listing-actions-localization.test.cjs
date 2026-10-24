const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const copySource = read(projectRoot, "src", "app", "listing", "[id]", "_components", "listing-actions-copy.ts");
const vehicleCardSource = read(projectRoot, "src", "components", "vehicle", "VehicleCard.tsx");
const shareSource = read(projectRoot, "src", "app", "listing", "[id]", "_components", "ShareListingButton.tsx");
const reportSource = read(projectRoot, "src", "app", "listing", "[id]", "_components", "ReportListingButton.tsx");

function loadModule(source) {
  const loadedModule = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", output)(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

function shape(value) {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, typeof value[key]]));
}

const { getListingActionsCopy } = loadModule(copySource);
const ru = getListingActionsCopy("ru");
const kk = getListingActionsCopy("kk");
const en = getListingActionsCopy("en");
const zhCN = getListingActionsCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(shape(copy), shape(ru), `${locale} must expose the complete listing-actions contract`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} must be direct launch copy rather than a Russian fallback`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} must not contain placeholder or corrupted copy`);
}

assert.equal(getListingActionsCopy("de"), ru, "Unsupported Jolmod locales must fall back to Russian");
assert.equal(getListingActionsCopy("tr"), ru, "Turkish must never be a Jolmod listing-actions fallback");
assert.match(zhCN.reportListing, /[\u4E00-\u9FFF]/, "zh-CN listing actions must contain Simplified Chinese text");
assert.doesNotMatch(JSON.stringify(zhCN), /關|體|臺/, "zh-CN listing actions must not contain Traditional Chinese placeholders");

assert.match(vehicleCardSource, /getListingActionsCopy/);
assert.match(vehicleCardSource, /actionsCopy\.previousPhoto/);
assert.match(vehicleCardSource, /actionsCopy\.nextPhoto/);
assert.match(vehicleCardSource, /actionsCopy\.published/);
assert.match(vehicleCardSource, /actionsCopy\.views/);
assert.match(shareSource, /getListingActionsCopy/);
assert.match(shareSource, /copy\.copied/);
assert.match(reportSource, /getListingActionsCopy/);
assert.match(reportSource, /copy\.environmentUnavailable/);
assert.match(reportSource, /copy\.failure/);
assert.match(reportSource, /schema\("marketplace"\)\.from\("reports"\)\.insert/);
assert.doesNotMatch(reportSource, /dictionary\.listing|dictionary\.errors/);

console.log("Listing-actions four-language localization tests passed.");
