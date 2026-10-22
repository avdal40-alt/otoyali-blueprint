const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const intent = read("src", "features", "ai", "search", "search-intent.ts");
const service = read("src", "features", "ai", "search", "search-service.ts");
const aiSearchDictionary = read("src", "i18n", "dictionaries", "ai-search.ts");
const aiAssistantDictionary = read("src", "i18n", "dictionaries", "ai-assistant.ts");
const searchService = read("src", "lib", "search", "search-service.ts");
const validator = read("src", "features", "ai", "services", "request-validator.ts");
const route = read("src", "app", "api", "ai", "assistant", "route.ts");

assert.match(intent, /searchIntentSchema/);
assert.match(intent, /\.strict\(\)/);
assert.match(intent, /mergeSearchIntent/);
assert.match(intent, /operation: z\.enum\(\["set", "clear", "keep", "reset"\]\)/);
assert.match(intent, /mapSearchIntentToSearchV1/);
assert.match(intent, /has_video/);
assert.match(intent, /verifiedDealer[\s\S]*unsupported: true/);
assert.match(intent, /milyon|million/);
assert.match(intent, /теңге/);
assert.match(intent, /мың/);
assert.match(intent, /坚戈/);
assert.doesNotMatch(intent, /\btry\b|\btl\b/i);
assert.match(intent, /mileageMax/);
assert.match(intent, /getAiSearchMessages/);
assert.doesNotMatch(intent, /The model does not belong to the selected make/);
assert.doesNotMatch(intent, /The district does not belong to the selected city/);
assert.match(service, /createPostgresSearchService/);
assert.match(searchService, /schema\("marketplace"\)\.rpc\("search_listings_v1"/);
assert.doesNotMatch(service, /seller_contact|service_role|from\("listings"\)/);
assert.match(service, /publicItem/);
assert.match(service, /getAiSearchResultsMessage/);
assert.doesNotMatch(service, /request\.locale === "tr"/);
assert.match(aiSearchDictionary, /searchResultsMessages/);
assert.match(aiSearchDictionary, /searchMessages/);
assert.match(aiAssistantDictionary, /assistantMessages/);
assert.match(aiSearchDictionary, /The model does not belong to the selected make/);
assert.match(aiSearchDictionary, /Seçilen marka mevcut değil/);
assert.doesNotMatch(service, /cover_image_url/);
assert.match(validator, /searchIntentSchema\.safeParse/);
assert.match(route, /deriveAiActor/);
assert.match(route, /getAiRateLimiter/);

const compiledIntent = ts.transpileModule(intent, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const intentModule = new Module(path.join(root, "src", "features", "ai", "search", "search-intent.ts"));
intentModule.filename = path.join(root, "src", "features", "ai", "search", "search-intent.ts");
intentModule.paths = Module._nodeModulePaths(path.dirname(intentModule.filename));
const load = Module._load;
Module._load = (request, parent, isMain) => {
  if (request === "@/i18n/config") return { DEFAULT_LOCALE: "en", getIntlLocale: (locale) => ({ ru: "ru-KZ", kk: "kk-KZ", "zh-CN": "zh-CN" }[locale] ?? "en-US") };
  if (request === "@/i18n/dictionaries/ai-search") return { getAiSearchMessages: () => ({ verifiedDealerUnavailable: "", compareCriteria: "", threshold: "", clarifyEntity: () => "", modelDoesNotMatchMake: "", variantDoesNotMatchModel: "", districtDoesNotMatchCity: "" }) };
  if (request === "@/i18n/types") return {};
  return load(request, parent, isMain);
};
try {
  intentModule._compile(compiledIntent, intentModule.filename);
} finally {
  Module._load = load;
}
const { normalizeNaturalLanguageNumber, resolveSearchText } = intentModule.exports;
assert.equal(normalizeNaturalLanguageNumber("2 миллион 300 мың теңге", "price", "kk"), 2300000);
assert.equal(normalizeNaturalLanguageNumber("2.3 million KZT", "price", "en"), 2300000);
assert.equal(normalizeNaturalLanguageNumber("230 万 坚戈", "price", "zh-CN"), 2300000);
assert.deepEqual(resolveSearchText("2 миллион 300 мың теңге дейін", { makes: [], models: [], variants: [], cities: [], districts: [] }, "kk").patch.values, { priceMax: 2300000 });
assert.deepEqual(resolveSearchText("under 2 million tenge", { makes: [], models: [], variants: [], cities: [], districts: [] }, "en").patch.values, { priceMax: 2000000 });
assert.deepEqual(resolveSearchText("less than 2 million tenge", { makes: [], models: [], variants: [], cities: [], districts: [] }, "en").patch.values, { priceMax: 2000000 });
assert.deepEqual(resolveSearchText("up to 50 thousand km", { makes: [], models: [], variants: [], cities: [], districts: [] }, "en").patch.values, { mileageMax: 50000 });
assert.deepEqual(resolveSearchText("не дороже 2 миллиона тенге", { makes: [], models: [], variants: [], cities: [], districts: [] }, "ru").patch.values, { priceMax: 2000000 });
assert.deepEqual(resolveSearchText("不超过 230 万 坚戈", { makes: [], models: [], variants: [], cities: [], districts: [] }, "zh-CN").patch.values, { priceMax: 2300000 });
assert.deepEqual(resolveSearchText("230 万 坚戈 以下", { makes: [], models: [], variants: [], cities: [], districts: [] }, "zh-CN").patch.values, { priceMax: 2300000 });
const emptyCatalog = { makes: [], models: [], variants: [], cities: [], districts: [] };
assert.deepEqual(resolveSearchText("автомат бензин с фото", emptyCatalog, "ru").patch.values, { fuel: "gasoline", transmission: "automatic", hasPhotos: true });
assert.deepEqual(resolveSearchText("ең арзан қолмен дизель", emptyCatalog, "kk").patch.values, { fuel: "diesel", transmission: "manual", sort: "price_asc" });
assert.deepEqual(resolveSearchText("带视频 自动 汽油", emptyCatalog, "zh-CN").patch.values, { fuel: "gasoline", transmission: "automatic", hasVideo: true });
assert.equal(resolveSearchText("清除筛选", emptyCatalog, "zh-CN").patch.operation, "reset");
console.log("AI-01B natural-language Search v1 adapter contract passed");
