const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const copySource = read("src", "app", "profile", "seller-contacts", "_components", "seller-contacts-copy.ts");
const clientSource = read("src", "app", "profile", "seller-contacts", "_components", "SellerContactsClient.tsx");

function loadModule(source) {
  const loaded = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", output)(loaded.exports, loaded);
  return loaded.exports;
}

function shape(copy) { return Object.fromEntries(Object.keys(copy).sort().map((key) => [key, typeof copy[key]])); }

const { getSellerContactsCopy } = loadModule(copySource);
const ru = getSellerContactsCopy("ru");
const kk = getSellerContactsCopy("kk");
const en = getSellerContactsCopy("en");
const zhCN = getSellerContactsCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(shape(copy), shape(ru), `${locale} must expose the full seller-contacts contract`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} must resolve direct seller-contacts copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} must not contain placeholder or corrupted copy`);
}

assert.equal(getSellerContactsCopy("de"), ru, "Unsupported Jolmod locales must fall back to Russian");
assert.equal(getSellerContactsCopy("tr"), ru, "Turkish must never be a Jolmod seller-contacts fallback");
assert.match(zhCN.title, /[\u4E00-\u9FFF]/, "zh-CN seller contacts must contain Simplified Chinese");
assert.doesNotMatch(JSON.stringify(zhCN), /關|體|臺/, "zh-CN seller contacts must not contain Traditional Chinese placeholders");
assert.match(clientSource, /getSellerContactsCopy\(locale\)/);
assert.doesNotMatch(clientSource, /dictionary\.profile/);
assert.match(clientSource, /list_own_verified_seller_contact_phones/);
assert.match(clientSource, /sync_own_verified_account_phone/);

console.log("Seller-contacts four-language localization tests passed.");
