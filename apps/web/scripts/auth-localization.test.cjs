const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "src", "lib", "auth", "auth-copy.ts");
const sourceBuffer = fs.readFileSync(file);
assert.equal(sourceBuffer.toString("utf8").includes("�"), false, "auth copy must be valid UTF-8 without replacement characters");
const source = sourceBuffer.toString("utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
new Function("exports", "module", "require", output)(loaded.exports, loaded, (request) => {
  if (request === "@/i18n/config") return { normalizeLocale: (locale) => locale?.toLowerCase().startsWith("en") ? "en" : "tr" };
  throw new Error(`Unexpected dependency: ${request}`);
});
const { getAuthCopy } = loaded.exports;
const tr = getAuthCopy("tr");
const required = ["createAccountTitle", "forgotPasswordTitle", "verifyTitle", "verifyBody", "resendCode", "resendCooldown", "createPasswordTitle", "resetPasswordTitle", "confirmPasswordLabel", "weakPassword", "passwordMismatch", "enrollmentRetry", "authConfiguration"];
for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const copy = getAuthCopy(locale);
  assert.notEqual(copy, tr, `${locale} must not resolve through Turkish fallback`);
  for (const key of required) assert.equal(typeof copy[key], "string", `${locale}.${key} must be direct copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|\?\?\?/i, `${locale} must not contain placeholders`);
}
const zh = getAuthCopy("zh-CN");
assert.match(zh.verifyTitle, /[\u4e00-\u9fff]/, "zh-CN must contain Simplified Chinese characters");
assert.doesNotMatch(JSON.stringify(zh), /[�□]|\?\?\?|TODO/i, "zh-CN must not contain corrupted or placeholder text");
assert.equal(getAuthCopy("zh").verifyCode, zh.verifyCode);
const authUiSource = fs.readFileSync(path.join(root, "src", "lib", "auth", "auth-ui.ts"), "utf8");
assert.doesNotMatch(authUiSource, /locale:\s*Locale\s*=\s*"tr"/, "auth UI helpers must not retain a Turkish runtime fallback");
assert.match(authUiSource, /locale:\s*Locale\s*=\s*"ru"/, "auth UI helpers must default to the Russian Jolmod fallback");
console.log("Auth four-language localization tests passed.");
