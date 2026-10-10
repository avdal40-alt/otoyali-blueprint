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
const format = loadTypeScriptModule(read("src", "lib", "format.ts"), "format.ts", {
  "@/i18n/config": {
    DEFAULT_LOCALE: "tr",
    normalizeLocale: (locale) => (String(locale ?? "").toLowerCase().startsWith("en") ? "en" : "tr")
  },
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
  `${new Intl.NumberFormat("kk-KZ", { maximumFractionDigits: 0 }).format(1234567)} ₸`
);
assert.equal(
  format.formatDate("2026-10-10T00:00:00.000Z", "tr", kazakhstan),
  new Intl.DateTimeFormat("kk-KZ", { day: "2-digit", month: "short", year: "numeric" }).format(new Date("2026-10-10T00:00:00.000Z"))
);

const invalidMarket = { ...kazakhstan, formatting: { ...kazakhstan.formatting, defaultIntlLocale: "not a locale" } };
assert.doesNotThrow(() => format.formatCurrency(1, "KZT", "tr", invalidMarket));
assert.equal(format.formatCurrency(1, "KZT", "tr", invalidMarket), "Fiyat belirtilmedi");
assert.equal(format.formatNumber(1, "tr", invalidMarket), "");
assert.equal(format.formatDate("2026-10-10", "tr", invalidMarket), "");

console.log("Country-aware formatter tests passed.");
