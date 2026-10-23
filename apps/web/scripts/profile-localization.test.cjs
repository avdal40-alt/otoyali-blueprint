const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const copyFile = path.join(root, "src", "app", "profile", "_components", "profile-copy.ts");
const clientFile = path.join(root, "src", "app", "profile", "_components", "ProfileClient.tsx");
const sourceBuffer = fs.readFileSync(copyFile);
const source = sourceBuffer.toString("utf8");

assert.equal(source.includes("�"), false, "profile copy must be valid UTF-8 without replacement characters");
assert.match(source, /const ru: ProfileCopy = \{/, "Russian profile copy must be direct");
assert.match(source, /const kk: ProfileCopy = \{/, "Kazakh profile copy must be direct");
assert.match(source, /const en: ProfileCopy = \{/, "English profile copy must be direct");
assert.match(source, /const zhCN: ProfileCopy = \{/, "Simplified Chinese profile copy must be direct");

const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const loaded = { exports: {} };
new Function("exports", "module", "require", output)(loaded.exports, loaded, (request) => {
  if (request === "@/i18n/config") return { normalizeLocale: (locale) => locale?.toLowerCase().startsWith("en") ? "en" : "tr" };
  throw new Error(`Unexpected dependency: ${request}`);
});

const { getProfileCopy } = loaded.exports;
const tr = getProfileCopy("tr");
const required = [
  "title", "detailsHint", "authConfiguration", "loadFailed", "saveFailed", "saveSuccess", "saving", "save",
  "loginRequiredTitle", "loginRequiredBody", "loginRequiredAction", "accountId", "phone", "noPhone",
  "listingCount", "createdAt", "noInfo", "fullName", "contactName", "dealerName", "displayName",
  "phoneVerifiedHint", "city", "selectCity", "sellerType", "verifiedDealer", "privateSeller",
  "dealerStatusHint", "myListings", "sellerContacts", "favorites", "messages", "notifications",
  "savedSearches", "dealerCrm", "dealerAnalytics", "settings", "publishListing", "logout"
];

for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const copy = getProfileCopy(locale);
  assert.notEqual(copy, tr, `${locale} must not resolve through Turkish fallback`);
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(getProfileCopy("ru")).sort(), `${locale} must have the complete ProfileCopy shape`);
  for (const key of required) assert.equal(typeof copy[key], "string", `${locale}.${key} must be direct profile copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|\?\?\?/i, `${locale} must not contain placeholder profile copy`);
}

const zh = getProfileCopy("zh-CN");
assert.match(JSON.stringify(zh), /[\u4e00-\u9fff]/, "zh-CN profile copy must contain Simplified Chinese characters");
assert.doesNotMatch(JSON.stringify(zh), /[�□]|\?\?\?|TODO/i, "zh-CN profile copy must not contain corrupted or placeholder text");
assert.equal(getProfileCopy("zh").title, zh.title, "zh alias must resolve to Simplified Chinese profile copy");

const clientSource = fs.readFileSync(clientFile, "utf8");
assert.match(clientSource, /getProfileCopy\(locale\)/, "profile client must use the direct launch-language copy contract");
assert.doesNotMatch(clientSource, /dictionary\.(profile|navigation|auth|notifications|errors|common)/, "profile client must not use legacy global dictionary copy");
assert.match(clientSource, /CURRENT_MARKET\.countryCode/, "profile fallback must retain active Kazakhstan market identity");
assert.match(clientSource, /normalizeStoredAuthPhoneToE164\(user\.phone\)/, "profile must retain canonical Kazakhstan phone presentation");
assert.match(clientSource, /localizePath\("\/", locale\)/, "profile logout must retain the selected locale");

console.log("Profile four-language localization tests passed.");
