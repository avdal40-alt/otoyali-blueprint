const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
const phoneSource = read("src", "lib", "auth", "phone.ts");
const marketSource = read("src", "lib", "market.ts");
const localeConfigSource = read("src", "i18n", "config.ts");
const marketModule = { exports: {} };
const localeConfigModule = { exports: {} };
const phoneModule = { exports: {} };
const compilerOptions = { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };

new Function("require", "module", "exports", ts.transpileModule(marketSource, { compilerOptions }).outputText)(require, marketModule, marketModule.exports);
new Function("require", "module", "exports", ts.transpileModule(localeConfigSource, { compilerOptions }).outputText)(require, localeConfigModule, localeConfigModule.exports);
new Function("require", "module", "exports", ts.transpileModule(phoneSource, { compilerOptions }).outputText)(
  (request) => request === "@/lib/market" ? marketModule.exports : request === "@/i18n/config" ? localeConfigModule.exports : require(request),
  phoneModule,
  phoneModule.exports
);

const { formatPhoneInputHelper, getAuthPhoneExample, getPhoneCountryOptions } = phoneModule.exports;
const englishHelper = "International format is supported. Example: {example}";
const turkishHelper = "Uluslararası format desteklenir. Örnek: {example}";

assert.equal(getAuthPhoneExample("KZ"), "+7 777 123 45 67");
assert.equal(getAuthPhoneExample("TR"), "+90 555 123 45 67");
assert.equal(formatPhoneInputHelper(englishHelper, "KZ"), "International format is supported. Example: +7 777 123 45 67");
assert.equal(formatPhoneInputHelper(turkishHelper, "TR"), "Uluslararası format desteklenir. Örnek: +90 555 123 45 67");
assert.notEqual(formatPhoneInputHelper(englishHelper, "KZ"), formatPhoneInputHelper(englishHelper, "TR"));

for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const kazakhstan = getPhoneCountryOptions(locale).find((option) => option.country === "KZ");
  assert.ok(kazakhstan, `${locale} country options include Kazakhstan`);
  assert.equal(kazakhstan.callingCode, "+7");
}
assert.doesNotMatch(phoneSource, /regionFallbacks|locale === "tr" \? "tr-TR" : "en-US"/);
assert.match(phoneSource, /getIntlLocale\(locale\)/);

const phoneInput = read("src", "components", "auth", "PhoneInput.tsx");
assert.match(phoneInput, /formatPhoneInputHelper\(helperText, selectedCountry\)/);
assert.doesNotMatch(phoneInput, /locale === "tr" \? "tr-TR" : "en-US"/);
assert.match(phoneInput, /getIntlLocale\(locale\)/);

for (const file of [
  ["src", "components", "auth", "AuthOtpStartClient.tsx"],
  ["src", "components", "auth", "PasswordEnrollmentClient.tsx"],
  ["src", "app", "login", "_components", "LoginClient.tsx"],
  ["src", "app", "otp", "_components", "OtpClient.tsx"],
  ["src", "components", "layout", "AppHeader.tsx"],
  ["src", "components", "layout", "MarketplaceFooter.tsx"]
]) {
  const source = read(...file);
  assert.match(source, /Jolcar|ACTIVE_MARKET_PROFILE\.brandName/);
  assert.doesNotMatch(source, /yolmod|otoyali/i);
}

for (const dictionary of ["en.ts", "tr.ts"]) {
  assert.match(read("src", "i18n", "dictionaries", dictionary), /phoneInputHelper: ".*\{example\}"/);
}

console.log("Jolcar auth phone hints and branding tests passed");
