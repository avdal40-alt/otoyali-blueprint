const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const provider = read("src", "features", "ai", "providers", "local-provider.ts");
const dictionary = read("src", "i18n", "dictionaries", "ai-local-provider.ts");

assert.match(provider, /getAiLocalProviderMessages/);
assert.doesNotMatch(provider, /request\.locale === "tr"/);
assert.match(provider, /поиск|іздеу|搜索/);
assert.match(provider, /объявлен|хабарландыру|车源/);
assert.match(provider, /опубликов|жарияла|发布/);
assert.match(provider, /безопас|қауіпсіз|安全/);
assert.match(provider, /цена|баға|价格/);
for (const locale of ["tr", "en", "ru", "kk", '"zh-CN"']) assert.match(dictionary, new RegExp(`${locale}:`));
assert.match(dictionary, /serviceCategories/);
assert.match(dictionary, /publishingChecklist/);
assert.match(dictionary, /trustChecklist/);

console.log("JLC-0523 local AI provider localization contract passed");
