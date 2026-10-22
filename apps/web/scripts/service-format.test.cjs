const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "features", "services", "domain", "format.ts"), "utf8");
assert.doesNotMatch(source, /currency \?\? "TRY"/);

const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const testModule = { exports: {} };
new Function("exports", "module", "require", output)(testModule.exports, testModule, (specifier) => {
  if (specifier === "@/i18n/get-dictionary") return { t: (_locale, key, params = {}) => `${key}:${params.price ?? ""}` };
  if (specifier === "@/lib/format") return { formatPrice: (amount, currency, locale) => `${amount}:${currency ?? "market-default"}:${locale}` };
  return {};
});

assert.equal(testModule.exports.servicePricingLabel({ pricingMode: "fixed", minAmount: 12000, locale: "en" }), "12000:market-default:en");
assert.equal(testModule.exports.servicePricingLabel({ pricingMode: "starting_from", minAmount: 12000, locale: "en" }), "services.pricing.startingFrom:12000:market-default:en");
assert.equal(testModule.exports.servicePricingLabel({ pricingMode: "range", minAmount: 12000, maxAmount: 18000, currency: "TRY", locale: "en" }), "12000:TRY:en - 18000:TRY:en");
console.log("Service pricing market-default formatting contract passed");
