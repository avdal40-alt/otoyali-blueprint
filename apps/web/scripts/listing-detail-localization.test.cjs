const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const copySource = read(projectRoot, "src", "app", "listing", "[id]", "listing-detail-copy.ts");
const pageSource = read(projectRoot, "src", "app", "listing", "[id]", "page.tsx");

function loadModule(source) {
  const loadedModule = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, (request) => {
    if (request === "@/i18n/config") return { normalizeLocale: (locale) => locale?.toLowerCase().startsWith("en") ? "en" : "tr" };
    throw new Error(`Unexpected dependency: ${request}`);
  });
  return loadedModule.exports;
}

function shape(value) {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, typeof value[key]]));
}

const { getListingDetailCopy } = loadModule(copySource);
const tr = getListingDetailCopy("tr");
const en = getListingDetailCopy("en");
const ru = getListingDetailCopy("ru");
const kk = getListingDetailCopy("kk");
const zhCN = getListingDetailCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(shape(copy), shape(tr), `${locale} must expose the complete listing-detail contract`);
  assert.notEqual(copy, tr, `${locale} must not resolve through Turkish fallback`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|\?\?\?/i, `${locale} must not contain placeholder copy`);
}

assert.equal(ru.vehicleSpecs, "Характеристики автомобиля");
assert.equal(kk.reviewOwners, "Осы көлікке қатысты иелер пікірін қарау");
assert.equal(en.safeShopping, "Safe buying advice");
assert.equal(zhCN.watchVideo, "观看视频");
assert.equal(getListingDetailCopy("zh").description, zhCN.description);
assert.equal(getListingDetailCopy("EN-us").seller, en.seller);
assert.equal(getListingDetailCopy("de"), tr, "Unsupported locales retain historical fallback until registry activation");

assert.match(pageSource, /const copy = getListingDetailCopy\(locale\)/);
assert.match(pageSource, /\{copy\.reviewOwners\}/);
assert.doesNotMatch(pageSource, /Осы көлікке қатысты иелер пікірін қарау/);
assert.doesNotMatch(pageSource, /getDictionary/);

console.log("Listing-detail four-language localization tests passed.");
