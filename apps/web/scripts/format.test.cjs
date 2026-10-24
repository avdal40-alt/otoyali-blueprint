const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

function loadTypeScriptModule(source, fileName, dependencies = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, (specifier) => dependencies[specifier] ?? require(specifier));
  return module.exports;
}

const market = loadTypeScriptModule(read("src", "lib", "market.ts"), "market.ts");
const location = loadTypeScriptModule(read("src", "lib", "location.ts"), "location.ts", {
  "@/lib/market": market
});
const formatEnumLabels = loadTypeScriptModule(read("src", "i18n", "dictionaries", "format-enum-labels.ts"), "format-enum-labels.ts");
const format = loadTypeScriptModule(read("src", "lib", "format.ts"), "format.ts", {
  "@/i18n/config": {
    DEFAULT_LOCALE: "tr",
    isKnownLocale: (locale) => ["tr", "en", "ru", "kk", "zh-CN"].includes(locale),
    isSupportedLocale: (locale) => ["tr", "en"].includes(locale),
    normalizeLocale: (locale) => (String(locale ?? "").toLowerCase().startsWith("en") ? "en" : "tr")
  },
  "@/i18n/dictionaries/format-fallbacks": { getFormatFallbackMessages: (locale) => ({ priceNotProvided: `${locale} price`, noInfo: `${locale} no info` }) },
  "@/i18n/dictionaries/format-enum-labels": formatEnumLabels,
  "@/i18n/get-dictionary": {
    t: (locale, key) => key === "format.priceNotProvided" ? (locale === "en" ? "Price not provided" : "Fiyat belirtilmedi") : "Bilgi yok"
  },
  "@/lib/market": market,
  "@/lib/location": location
});

const turkey = market.MARKET_PROFILES.yolmodTurkey;
const kazakhstan = market.MARKET_PROFILES.jolcarKazakhstan;

assert.equal(format.formatCurrency(1234567, "TRY", "tr", turkey), "1.234.567 TL");
assert.equal(format.formatCurrency(1234567, "TRY", "en", turkey), "TRY 1,234,567");
assert.equal(
  format.formatCurrency(1234567, "KZT", "tr", kazakhstan),
  `${new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(1234567)} ₸`
);
assert.equal(
  format.formatDate("2026-10-10T00:00:00.000Z", "tr", kazakhstan),
  new Intl.DateTimeFormat("ru-KZ", { day: "2-digit", month: "short", year: "numeric" }).format(new Date("2026-10-10T00:00:00.000Z"))
);

const invalidMarket = { ...kazakhstan, formatting: { ...kazakhstan.formatting, defaultIntlLocale: "not a locale" } };
assert.doesNotThrow(() => format.formatCurrency(1, "KZT", "tr", invalidMarket));
assert.equal(format.formatCurrency(1, "KZT", "tr", invalidMarket), "tr price");
assert.equal(format.formatNumber(1, "tr", invalidMarket), "");
assert.equal(format.formatDate("2026-10-10", "tr", invalidMarket), "");
assert.equal(format.formatNumber(1234567, "kk", kazakhstan), new Intl.NumberFormat("kk-KZ", { maximumFractionDigits: 0 }).format(1234567));
assert.equal(format.formatDate("2026-10-10T00:00:00.000Z", "zh-CN", kazakhstan), new Intl.DateTimeFormat("zh-CN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date("2026-10-10T00:00:00.000Z")));
for (const [locale, intlLocale] of [["ru", "ru-KZ"], ["kk", "kk-KZ"], ["en", "en-US"], ["zh-CN", "zh-CN"]]) {
  const formatted = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(1234567);
  assert.equal(format.formatCurrency(1234567, "KZT", locale, kazakhstan), `${formatted} ₸`, `${locale} must retain Kazakhstan tenge formatting`);
  assert.equal(format.formatNumber(1234567, locale, kazakhstan), formatted, `${locale} must use its configured number locale`);
  assert.equal(format.formatMileage(1234567, locale, kazakhstan), `${formatted} km`, `${locale} must retain mileage units`);
  assert.equal(format.formatDate("2026-10-10T00:00:00.000Z", locale, kazakhstan), new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date("2026-10-10T00:00:00.000Z")), `${locale} must use its configured date locale`);
}
assert.equal(format.formatCurrency(null, "KZT", "ru", kazakhstan), "ru price");
assert.equal(format.formatMileage(null, "zh-CN", kazakhstan), "zh-CN no info");
assert.equal(format.fuelLabel("diesel", "ru"), "Дизель");
assert.equal(format.transmissionLabel("automatic", "kk"), "Автоматты");
assert.equal(format.bodyTypeLabel("suv", "zh-CN"), "SUV");
assert.equal(format.damageStateLabel("heavy_damage", "ru"), "Тяжёлые повреждения");

console.log("Country-aware formatter tests passed.");
