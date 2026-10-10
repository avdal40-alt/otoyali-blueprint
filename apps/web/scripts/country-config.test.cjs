const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

function loadTypeScriptModule(source, fileName) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, require);
  return module.exports;
}

const market = loadTypeScriptModule(read("src", "lib", "market.ts"), "market.ts");
const metadataSource = read("src", "lib", "seo", "metadata.ts");
const layoutSource = read("src", "app", "layout.tsx");
const footerSource = read("src", "components", "layout", "MarketplaceFooter.tsx");

assert.deepEqual(Object.keys(market.MARKET_PROFILES), ["yolmodTurkey", "jolcarKazakhstan"]);
assert.equal(market.ACTIVE_MARKET_PROFILE_KEY, "yolmodTurkey");
assert.strictEqual(market.CURRENT_MARKET, market.ACTIVE_MARKET_PROFILE);

assert.deepEqual(market.MARKET_PROFILES.yolmodTurkey, {
  id: "turkey",
  countryCode: "TR",
  brandName: "Yolmod",
  siteUrl: "https://yolmod.com",
  currencyCode: "TRY",
  metadata: {
    defaultTitle: "Türkiye'nin akıllı araç pazarı",
    description: "Otomobil, ticari araç, deniz araçları, yedek parça, sigorta ve araç videoları tek platformda.",
    openGraphDescription: "Türkiye'nin akıllı araç pazarı.",
    defaultLocale: "tr_TR"
  },
  formatting: {
    defaultIntlLocale: "tr-TR",
    intlLocaleByLocale: { tr: "tr-TR", en: "en-US" },
    defaultCurrencyLabel: "TL",
    currencyLabelByLocale: { en: "TRY" },
    defaultCurrencyPlacement: "suffix",
    currencyPlacementByLocale: { en: "prefix" }
  },
  defaultPhoneCountry: "TR",
  phonePolicy: {
    login: { allowedCountries: "any" },
    sellerContacts: {
      enabled: true,
      allowedCountries: ["TR"],
      verificationPurpose: "turkey_seller_contact",
      verificationProvider: "twilio_verify",
      callingCode: "+90",
      nationalPlaceholder: "555 123 45 67"
    }
  },
  status: "active"
});
assert.deepEqual(market.MARKET_PROFILES.jolcarKazakhstan, {
  id: "kazakhstan",
  countryCode: "KZ",
  brandName: "Jolcar",
  siteUrl: null,
  currencyCode: "KZT",
  metadata: {
    defaultTitle: "Қазақстанның ақылды көлік нарығы",
    description: "Көліктерді, қосалқы бөлшектерді және автокөлік қызметтерін бір платформадан табыңыз.",
    openGraphDescription: "Қазақстанның ақылды көлік нарығы.",
    defaultLocale: "kk_KZ"
  },
  formatting: {
    defaultIntlLocale: "kk-KZ",
    intlLocaleByLocale: {},
    defaultCurrencyLabel: "₸",
    defaultCurrencyPlacement: "suffix"
  },
  defaultPhoneCountry: "KZ",
  phonePolicy: {
    login: { allowedCountries: "any" },
    sellerContacts: { enabled: false }
  },
  status: "planned"
});
assert.notEqual(market.MARKET_PROFILES.yolmodTurkey.countryCode, market.MARKET_PROFILES.jolcarKazakhstan.countryCode);
assert.equal(metadataSource.includes('"https://yolmod.com"'), false, "SEO must not independently hardcode the active host");
assert.equal(metadataSource.includes('"Yolmod"'), false, "SEO must not independently hardcode the active brand");
assert.match(metadataSource, /ACTIVE_MARKET_PROFILE\.siteUrl/);
assert.match(metadataSource, /ACTIVE_MARKET_PROFILE\.brandName/);
for (const [fileName, source] of [["layout", layoutSource], ["footer", footerSource]]) {
  assert.match(source, /ACTIVE_MARKET_PROFILE\.brandName/, `${fileName} must consume the active brand profile`);
  assert.equal(source.includes('"Yolmod"'), false, `${fileName} must not independently hardcode the active brand`);
}
assert.equal(layoutSource.includes('"https://yolmod.com"'), false, "Root metadata must not independently hardcode the active host");
assert.match(layoutSource, /ACTIVE_MARKET_PROFILE\.siteUrl/);
assert.match(layoutSource, /ACTIVE_MARKET_PROFILE\.metadata/);
assert.doesNotMatch(metadataSource, /tr_TR/);

console.log("Country/brand configuration tests passed.");
