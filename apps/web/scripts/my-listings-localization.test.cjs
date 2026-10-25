const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const source = read("src", "app", "profile", "listings", "my-listings-copy.ts");
const loaded = { exports: {} };
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
new Function("exports", "module", output)(loaded.exports, loaded);

const { getMyListingsCopy } = loaded.exports;
const ru = getMyListingsCopy("ru");
const kk = getMyListingsCopy("kk");
const en = getMyListingsCopy("en");
const zhCN = getMyListingsCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(ru).sort(), `${locale} must expose the full active My Listings contract`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} must resolve direct My Listings copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} must not contain placeholders or corrupted copy`);
}

assert.equal(getMyListingsCopy("de"), ru, "Unsupported Jolmod locales must fall back to Russian");
assert.equal(getMyListingsCopy("tr"), ru, "Turkish must never be a Jolmod My Listings fallback");
assert.match(JSON.stringify(zhCN), /[\u4E00-\u9FFF]/, "zh-CN must contain Simplified Chinese text");
assert.doesNotMatch(JSON.stringify(zhCN), /關|體|臺/, "zh-CN must not contain Traditional Chinese placeholders");

for (const file of [
  ["src", "app", "my-listings", "page.tsx"],
  ["src", "app", "profile", "listings", "page.tsx"],
  ["src", "app", "profile", "listings", "_components", "ListingVideoManager.tsx"]
]) {
  const component = read(...file);
  assert.match(component, /getMyListingsCopy/);
  assert.doesNotMatch(component, /dictionary\.myListings/);
}

console.log("My Listings and seller video manager four-language localization tests passed.");
