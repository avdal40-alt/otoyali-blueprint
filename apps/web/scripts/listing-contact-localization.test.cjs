const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "src", "app", "listing", "[id]", "_components", "listing-contact-copy.ts"), "utf8");
const component = fs.readFileSync(path.join(projectRoot, "src", "app", "listing", "[id]", "_components", "ContactSellerButton.tsx"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, (request) => {
  if (request === "@/i18n/config") return { normalizeLocale: (locale) => locale?.toLowerCase().startsWith("en") ? "en" : "tr" };
  throw new Error(`Unexpected dependency: ${request}`);
});
const { getListingContactCopy } = loadedModule.exports;
const tr = getListingContactCopy("tr");
for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const copy = getListingContactCopy(locale);
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(tr).sort(), `${locale} contact copy shape must be complete`);
  assert.notEqual(copy, tr, `${locale} contact copy must not resolve through Turkish fallback`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|\?\?\?/i);
}
assert.equal(getListingContactCopy("ru").contactSeller, "Связаться с продавцом");
assert.equal(getListingContactCopy("kk").contactSeller, "Сатушымен байланысу");
assert.equal(getListingContactCopy("zh-CN").loading, "加载中");
assert.match(component, /getListingContactCopy\(locale\)/);
assert.doesNotMatch(component, /dictionary\.(common|listing|errors)/);
console.log("Listing-contact four-language localization tests passed.");
