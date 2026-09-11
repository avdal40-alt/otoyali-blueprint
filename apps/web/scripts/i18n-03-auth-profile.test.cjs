const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

function load(source, filename, requireImpl = require) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, requireImpl);
  return module.exports;
}

const config = load(read("src", "i18n", "config.ts"), "config.ts");
const tr = load(read("src", "i18n", "dictionaries", "tr.ts"), "tr.ts").tr;
const en = load(read("src", "i18n", "dictionaries", "en.ts"), "en.ts").en;
const dictionary = load(read("src", "i18n", "get-dictionary.ts"), "get-dictionary.ts", (request) => {
  if (request === "./dictionaries/en") return { en };
  if (request === "./dictionaries/tr") return { tr };
  if (request === "./config") return config;
  throw new Error(`Unexpected dictionary dependency: ${request}`);
});
const authUi = load(read("src", "lib", "auth", "auth-ui.ts"), "auth-ui.ts", (request) => {
  if (request === "@/i18n/get-dictionary") return dictionary;
  if (request === "@/i18n/types") return {};
  if (request === "./return-path") return { safeNextPath: (value, fallback) => value?.startsWith("/") && !value.startsWith("//") ? value : fallback };
  throw new Error(`Unexpected auth UI dependency: ${request}`);
});
const middleware = load(read("src", "middleware.ts"), "middleware.ts", (request) => {
  if (request === "next/server") {
    return { NextResponse: { next: (options) => ({ kind: "next", options, cookies: { set() {} } }), redirect: (url) => ({ kind: "redirect", url: url.toString(), cookies: { set() {} } }), rewrite: (url, options) => ({ kind: "rewrite", url: url.toString(), options, cookies: { set() {} } }), json: () => ({ kind: "json", cookies: { set() {} } }) } };
  }
  if (request === "./i18n/config") return config;
  throw new Error(`Unexpected middleware dependency: ${request}`);
});

function request(pathname, locale, acceptLanguage) {
  const url = new URL(pathname, "https://otoyali.example");
  url.clone = () => new URL(url);
  return { url: url.toString(), nextUrl: url, headers: new Headers(acceptLanguage ? { "accept-language": acceptLanguage } : {}), cookies: { get: () => locale ? { value: locale } : undefined, set() {} } };
}

assert.deepEqual(config.SUPPORTED_LOCALES, ["tr", "en"]);
assert.equal(dictionary.t("tr", "auth.otpLabel"), "Doğrulama kodu");
assert.equal(dictionary.t("en", "auth.otpLabel"), "Verification code");
assert.equal(dictionary.t("tr", "profile.saveSuccess"), "Profil kaydedildi.");
assert.equal(dictionary.t("en", "profile.saveSuccess"), "Profile saved.");
assert.equal(dictionary.t("tr", "profile.fullName"), "Ad soyad");
assert.equal(dictionary.t("en", "profile.fullName"), "Full name");
assert.equal(authUi.authErrorMessage("invalid_or_expired_otp", "tr"), "Kod doğrulanamadı. Lütfen tekrar deneyin.");
assert.equal(authUi.authErrorMessage("invalid_or_expired_otp", "en"), "The code could not be verified. Please try again.");
assert.equal(authUi.authErrorMessage(authUi.mapAuthError("unexpected request uuid=internal"), "en"), "We could not complete the action. Please try again.");
assert.equal(authUi.authErrorMessage(authUi.mapAuthError("too many requests"), "tr"), "Çok fazla deneme yapıldı. Lütfen kısa bir süre bekleyip tekrar deneyin.");
assert.equal(authUi.safeNextPath("https://attacker.example", "/profile"), "/profile");
assert.equal(authUi.safeNextPath("/en/profile?tab=account", "/profile"), "/en/profile?tab=account");

assert.equal(middleware.middleware(request("/auth/callback?code=secret", "en")).kind, "next");
assert.equal(middleware.middleware(request("/api/profile", "en")).kind, "next");
assert.equal(middleware.middleware(request("/profile", undefined, "en")).kind, "redirect");

const otpInput = read("src", "components", "auth", "OtpInput.tsx");
const phoneInput = read("src", "components", "auth", "PhoneInput.tsx");
const profile = read("src", "app", "profile", "_components", "ProfileClient.tsx");
const authCallback = read("src", "app", "auth", "callback", "_components", "AuthCallbackClient.tsx");
const authCallbackSource = ts.createSourceFile("AuthCallbackClient.tsx", authCallback, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const callbackAuthErrorCalls = [];
let callbackReadsActiveLocale = false;
function collectCallbackAuthErrorCalls(node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isObjectBindingPattern(node.name) &&
    node.initializer &&
    ts.isCallExpression(node.initializer) &&
    ts.isIdentifier(node.initializer.expression) &&
    node.initializer.expression.text === "useI18n"
  ) {
    callbackReadsActiveLocale = node.name.elements.some((element) => ts.isIdentifier(element.name) && element.name.text === "locale");
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "authErrorMessage") {
    callbackAuthErrorCalls.push(node);
  }
  ts.forEachChild(node, collectCallbackAuthErrorCalls);
}
collectCallbackAuthErrorCalls(authCallbackSource);

assert.match(otpInput, /label: string/);
assert.match(otpInput, /htmlFor="otp-code"/);
assert.match(otpInput, /dir="ltr"/);
assert.match(phoneInput, /htmlFor=\{phoneId\}/);
assert.match(phoneInput, /aria-label=\{countryLabel\}/);
assert.match(profile, /dictionary\.profile\.saveSuccess/);
assert.doesNotMatch(profile, /Profil kaydedildi|Profil kaydedilemedi|Supabase ortam değişkenleri eksik/);
assert.equal(callbackReadsActiveLocale, true, "Callback must read the active locale from useI18n");
assert.equal(callbackAuthErrorCalls.length, 2, "Callback must keep both public auth error paths covered");
for (const call of callbackAuthErrorCalls) {
  assert.equal(call.arguments.length, 2, "Callback auth errors must receive the active locale");
  assert.ok(ts.isIdentifier(call.arguments[1]) && call.arguments[1].text === "locale", "Callback auth errors must use the locale from useI18n");
}

console.log("I18N-03 auth and profile tests passed.");
