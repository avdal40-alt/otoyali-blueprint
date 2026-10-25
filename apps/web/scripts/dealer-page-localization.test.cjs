const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const source = read("src", "i18n", "dealer-page-copy.ts");
const loaded = { exports: {} };
new Function("exports", "module", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded.exports, loaded);
const { getDealerPageCopy, getDealerPageValue } = loaded.exports;
const ru = getDealerPageCopy("ru");
for (const [locale, copy] of Object.entries({ ru, kk: getDealerPageCopy("kk"), en: getDealerPageCopy("en"), "zh-CN": getDealerPageCopy("zh-CN") })) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(ru).sort(), `${locale} dealer page shape`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} has direct dealer copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i);
}
assert.equal(getDealerPageCopy("de"), ru);
assert.equal(getDealerPageCopy("tr"), ru);
assert.match(JSON.stringify(getDealerPageCopy("zh-CN")), /[\u4E00-\u9FFF]/);
assert.equal(getDealerPageValue("kk", "profile.dealerPage.tabs.cars"), "Көліктер");
assert.equal(getDealerPageValue("ru", "profile.verifiedDealer"), ru.verifiedDealer);
assert.equal(getDealerPageValue("en", "profile.title"), undefined);
const page = read("src", "app", "dealer", "[id]", "page.tsx");
assert.match(page, /profile\.dealerPage/);
console.log("Public dealer page four-language localization tests passed.");
