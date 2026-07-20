const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "src", "lib", "auth", "phone.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  },
  fileName: sourcePath
}).outputText;
const phoneModule = { exports: {} };

new Function("require", "module", "exports", compiled)(require, phoneModule, phoneModule.exports);

const {
  DEFAULT_PHONE_COUNTRY,
  getPhoneCountryOptions,
  parseAuthPhoneNumber
} = phoneModule.exports;

function expectValid(rawInput, selectedCountry, expected) {
  const result = parseAuthPhoneNumber(rawInput, selectedCountry);
  assert.equal(result.ok, true, `${rawInput} should parse`);
  assert.equal(result.e164, expected.e164);
  assert.equal(result.country, expected.country);
}

function expectInvalid(rawInput, selectedCountry, expectedError) {
  const result = parseAuthPhoneNumber(rawInput, selectedCountry);
  assert.equal(result.ok, false, `${rawInput} should fail`);
  assert.equal(result.error, expectedError);
}

expectValid("0555 123 45 67", "TR", { e164: "+905551234567", country: "TR" });
expectValid("+90 555 123 45 67", "US", { e164: "+905551234567", country: "TR" });
expectValid("+7 701 123 45 67", "TR", { e164: "+77011234567", country: "KZ" });
expectValid("+7 916 123 45 67", "TR", { e164: "+79161234567", country: "RU" });
expectValid("+1 415 555 2671", "TR", { e164: "+14155552671", country: "US" });
expectValid("+33 1 23 45 67 89", "TR", { e164: "+33123456789", country: "FR" });
expectValid("+49 1511 2345678", "TR", { e164: "+4915112345678", country: "DE" });
expectValid("+971 50 123 4567", "TR", { e164: "+971501234567", country: "AE" });
expectInvalid("+7", "TR", "malformed_number");

const trCountries = getPhoneCountryOptions("tr");
assert.equal(DEFAULT_PHONE_COUNTRY, "TR");
assert.equal(trCountries[0].country, "TR");
assert.equal(trCountries[0].callingCode, "+90");
assert.ok(trCountries.some((item) => item.country === "KZ" && item.callingCode === "+7"));
assert.ok(trCountries.some((item) => item.country === "RU" && item.callingCode === "+7"));

console.log("phone-auth tests passed");
