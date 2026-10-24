const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const copySource = read(projectRoot, "src", "app", "sell", "_components", "sell-entry-copy.ts");
const pageSource = read(projectRoot, "src", "app", "sell", "page.tsx");
const gateSource = read(projectRoot, "src", "app", "sell", "_components", "SellerEntryGate.tsx");
const flowSource = read(projectRoot, "src", "components", "seller", "SellerContactVerificationFlow.tsx");

function loadModule(source) {
  const loadedModule = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", output)(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

function shape(value) {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, typeof value[key]]));
}

const { getSellEntryCopy } = loadModule(copySource);
const ru = getSellEntryCopy("ru");
const kk = getSellEntryCopy("kk");
const en = getSellEntryCopy("en");
const zhCN = getSellEntryCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(shape(copy), shape(ru), `${locale} must expose the complete seller-entry contract`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} must resolve direct seller-entry copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} must not contain placeholder or corrupted copy`);
}

assert.match(ru.phoneVerificationBody, /\+7/, "Russian seller-entry copy must retain Kazakhstan +7");
assert.match(kk.phoneVerificationBody, /\+7/, "Kazakh seller-entry copy must retain Kazakhstan +7");
assert.match(en.phoneVerificationBody, /\+7/, "English seller-entry copy must retain Kazakhstan +7");
assert.match(zhCN.phoneVerificationBody, /\+7/, "Chinese seller-entry copy must retain Kazakhstan +7");
assert.equal(getSellEntryCopy("de"), ru, "Unsupported Jolmod locales must resolve through Russian");
assert.equal(getSellEntryCopy("tr"), ru, "Turkish must never be a Jolmod seller-entry fallback");
assert.match(zhCN.phoneVerificationTitle, /[\u4E00-\u9FFF]/, "zh-CN seller-entry copy must contain Simplified Chinese");
assert.doesNotMatch(JSON.stringify(zhCN), /關|體|臺/, "zh-CN seller-entry copy must not contain Traditional Chinese placeholders");

for (const source of [pageSource, gateSource, flowSource]) assert.match(source, /getSellEntryCopy/);
assert.match(pageSource, /sellCopy\.agreementPrefix/);
assert.doesNotMatch(pageSource, /dictionary\.sell\.(?:title|eyebrow|agreementPrefix|agreementMiddle|agreementSuffix|listingRules|terms)/);
assert.doesNotMatch(gateSource, /dictionary\.sell/);
assert.doesNotMatch(flowSource, /dictionary\.sell/);
assert.match(flowSource, /sellerContactPhonePlaceholder/);
assert.match(flowSource, /phone-verification\/start/);
assert.match(flowSource, /phone-verification\/verify/);

console.log("Seller-entry four-language localization tests passed.");
