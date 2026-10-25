const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const source = read("src", "i18n", "service-page-copy.ts");
const loaded = { exports: {} };
new Function("exports", "module", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded.exports, loaded);
const { getServicePageCopy, getServicePageValue } = loaded.exports;

const ru = getServicePageCopy("ru");
for (const [locale, copy] of Object.entries({ ru, kk: getServicePageCopy("kk"), en: getServicePageCopy("en"), "zh-CN": getServicePageCopy("zh-CN") })) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(ru).sort(), `${locale} service copy shape`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} has its own direct copy`);
  assert.ok(Object.values(copy).every((value) => typeof value === "string" && value.trim()), `${locale} has no empty launch copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} has no placeholders`);
}
assert.equal(getServicePageCopy("de"), ru, "unsupported Jolmod UI locale falls back to Russian");
assert.equal(getServicePageCopy("tr"), ru, "Turkish never becomes a Jolmod service fallback");
assert.match(JSON.stringify(getServicePageCopy("zh-CN")), /[\u4E00-\u9FFF]/, "Simplified Chinese service copy contains Han text");
assert.equal(getServicePageValue("kk", "services.apply.fields.city"), "Қала");
assert.equal(getServicePageValue("zh-CN", "services.categories.towing.label"), "拖车");
assert.equal(getServicePageValue("en", "services.provider.notFoundTitle"), "Service provider not found");
assert.equal(getServicePageValue("ru", "profile.title"), undefined);

const serviceFiles = [
  ["src", "app", "servisler", "page.tsx"], ["src", "app", "servisler", "[slug]", "page.tsx"], ["src", "app", "servisler", "basvuru", "page.tsx"],
  ["src", "features", "services", "components", "ServicesMarketplacePage.tsx"], ["src", "features", "services", "components", "ServiceApplicationForm.tsx"],
  ["src", "features", "services", "domain", "format.ts"], ["src", "app", "admin", "_components", "AdminClient.tsx"]
];
const staticKeys = new Set();
for (const file of serviceFiles) {
  const content = read(...file);
  for (const match of content.matchAll(/t\(locale,\s*["'](services\.[^"']+)["']/g)) staticKeys.add(match[1]);
}
for (const key of staticKeys) assert.equal(typeof getServicePageValue("ru", key), "string", `Russian direct value for ${key}`);
for (const category of ["periodic_maintenance", "towing", "other"]) assert.equal(typeof getServicePageValue("kk", `services.categories.${category}.description`), "string");
for (const specialization of ["passenger_cars", "roadside_towing"]) assert.equal(typeof getServicePageValue("zh-CN", `services.specializations.${specialization}.label`), "string");
assert.doesNotMatch(source, /dictionaries\/(tr|en)|getDictionary|Turkey|Türkiye/i, "service launch copy has no historical dictionary dependency");
console.log("Service marketplace four-language localization tests passed.");
