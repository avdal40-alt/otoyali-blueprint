const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

function transpile(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
}

function loadModule(source, fileName, requireImpl = require) {
  const module = { exports: {} };
  new Function("exports", "module", "require", transpile(source, fileName))(module.exports, module, requireImpl);
  return module.exports;
}

const config = loadModule(read("src", "i18n", "config.ts"), "config.ts");
const market = loadModule(read("src", "lib", "market.ts"), "market.ts");
const completeness = loadModule(read("src", "i18n", "completeness.ts"), "completeness.ts");
const tr = loadModule(read("src", "i18n", "dictionaries", "tr.ts"), "tr.ts").tr;
const en = loadModule(read("src", "i18n", "dictionaries", "en.ts"), "en.ts").en;
const dictionaries = loadModule(read("src", "i18n", "get-dictionary.ts"), "get-dictionary.ts", (request) => {
  if (request === "./config") return config;
  if (request === "./dictionaries/tr") return { tr };
  if (request === "./dictionaries/en") return { en };
  throw new Error(`Unexpected dictionary dependency: ${request}`);
});

function createNextResponse(kind, url, options) {
  const cookies = new Map();
  return {
    kind,
    url: url?.toString(),
    status: options?.status,
    requestHeaders: options?.request?.headers,
    headers: options?.headers,
    cookies: {
      set(name, value) {
        cookies.set(name, value);
      },
      get(name) {
        return cookies.get(name);
      }
    }
  };
}

const middleware = loadModule(read("src", "middleware.ts"), "middleware.ts", (request) => {
  if (request === "next/server") {
    return {
      NextResponse: {
        next: (options) => createNextResponse("next", undefined, options),
        redirect: (url, options) => createNextResponse("redirect", url, options),
        rewrite: (url, options) => createNextResponse("rewrite", url, options),
        json: (_body, options) => createNextResponse("json", undefined, options)
      }
    };
  }
  if (request === "./i18n/config") return config;
  throw new Error(`Unexpected middleware dependency: ${request}`);
});

function middlewareRequest(pathname, { acceptLanguage, locale } = {}) {
  const url = new URL(pathname, "https://otoyali.example");
  url.clone = () => new URL(url);
  const cookies = new Map(locale ? [[config.LOCALE_COOKIE_NAME, locale]] : []);
  return {
    nextUrl: url,
    headers: new Headers(acceptLanguage ? { "accept-language": acceptLanguage } : {}),
    cookies: {
      get: (name) => (cookies.has(name) ? { value: cookies.get(name) } : undefined),
      set: (name, value) => cookies.set(name, value)
    }
  };
}

function runMiddleware(pathname, options) {
  const request = middlewareRequest(pathname, options);
  return { request, response: middleware.middleware(request) };
}

assert.deepEqual(Object.keys(config.LOCALE_REGISTRY), ["tr", "en", "ru", "ar", "zh-CN"]);
assert.equal(config.DEFAULT_LOCALE, "tr");
assert.equal(config.getLocaleTag("tr"), "tr-TR");
assert.equal(config.getLocaleDirection("ar"), "rtl");
assert.equal(config.getLocaleTag("zh-CN"), "zh-CN");
assert.equal(config.isKnownLocale("toString"), false);
assert.deepEqual(config.SUPPORTED_LOCALES, ["tr", "en"]);
assert.deepEqual(config.FUTURE_LOCALES, ["ru", "ar", "zh-CN"]);
assert.deepEqual(Object.keys(config.LOCALE_CONFIG), ["tr", "en"], "Compatibility configuration must not expose future locales");
assert.equal(config.normalizeLocale("ru"), "tr", "Unreleased locales must not be publicly negotiated yet");
assert.equal(config.normalizeLocale("ar"), "tr", "Unreleased locales must not be publicly negotiated yet");
assert.equal(config.normalizeLocale("zh-CN"), "tr", "Unreleased locales must not be publicly negotiated yet");

assert.equal(market.CURRENT_MARKET.id, "turkey");
assert.equal(market.CURRENT_MARKET.currencyCode, "TRY");
assert.equal(market.CURRENT_MARKET.defaultPhoneCountry, "TR");
assert.equal("locale" in market.CURRENT_MARKET, false, "Market configuration must not derive from locale");

assert.deepEqual(completeness.findMissingTranslationKeys(tr, en), []);
assert.deepEqual(completeness.findMissingTranslationKeys({ common: { required: "Required" } }, { common: {} }), ["common.required"]);
assert.equal(config.getLocaleTag("tr"), "tr-TR");
assert.equal(config.getLocaleDirection("tr"), "ltr");
assert.equal(config.getLocaleTag("en"), "en");
assert.equal(config.getLocaleDirection("en"), "ltr");

assert.equal(config.localizePath("/ikinci-el-araba", "en"), "/en/used-cars");
assert.equal(config.localizePath("/en/used-cars", "tr"), "/ikinci-el-araba");
assert.equal(config.localizePath("/servisler/basvuru", "en"), "/en/services/apply");
assert.equal(config.localizePath("/en/services/apply", "tr"), "/servisler/basvuru");

let result = runMiddleware("/api/ai/assistant", { acceptLanguage: "en" });
assert.equal(result.response.kind, "next", "API requests must not be locale redirected");
assert.equal(result.request.nextUrl.pathname, "/api/ai/assistant");
result = runMiddleware("/api/ai/assistant", { locale: "en" });
assert.equal(result.response.kind, "next", "Locale cookies must not prefix API paths");
result = runMiddleware("/api", { acceptLanguage: "en" });
assert.equal(result.response.kind, "next", "The exact API namespace root must not be locale redirected");

result = runMiddleware("/auth/callback?code=test", { acceptLanguage: "en" });
assert.equal(result.response.kind, "next", "Auth callbacks must not be locale redirected");
assert.equal(result.request.nextUrl.pathname, "/auth/callback");
assert.equal(result.request.nextUrl.search, "?code=test", "Auth callback query parameters must remain intact");
result = runMiddleware("/auth/callback?code=test", { locale: "en" });
assert.equal(result.response.kind, "next", "Locale cookies must not prefix auth callbacks");

result = runMiddleware("/about");
assert.equal(result.response.kind, "next", "Turkish public paths remain unprefixed");
assert.equal(result.response.requestHeaders.get(config.LOCALE_HEADER_NAME), "tr");
result = runMiddleware("/en/about");
assert.equal(result.response.kind, "rewrite");
assert.equal(new URL(result.response.url).pathname, "/about");
result = runMiddleware("/tr/about");
assert.equal(result.response.kind, "redirect");
assert.equal(new URL(result.response.url).pathname, "/about");
result = runMiddleware("/about", { locale: "tr" });
assert.equal(result.response.kind, "next", "The Turkish canonical redirect must not loop");

for (const locale of ["ru", "ar", "zh-CN"]) {
  result = runMiddleware(`/${locale}`, { acceptLanguage: locale, locale });
  assert.equal(result.response.kind, "next", `${locale} must not become a public locale route`);
  assert.equal(result.response.requestHeaders.get(config.LOCALE_HEADER_NAME), "tr");
  assert.equal(config.pickLocaleFromAcceptLanguage(locale), "tr");
}

const originalCutoverMode = process.env.NEXT_PUBLIC_YOLMOD_CUTOVER_MODE;
process.env.NEXT_PUBLIC_YOLMOD_CUTOVER_MODE = "maintenance";
result = runMiddleware("/api/ai/assistant", { acceptLanguage: "en" });
assert.equal(result.response.kind, "json", "Maintenance mode must remain first for API paths");
assert.equal(result.response.status, 503);
result = runMiddleware("/auth/callback?code=test", { acceptLanguage: "en" });
assert.equal(result.response.kind, "rewrite", "Maintenance mode must remain first for auth callbacks");
assert.equal(new URL(result.response.url).pathname, "/maintenance");
result = runMiddleware("/maintenance", { acceptLanguage: "en" });
assert.equal(result.response.kind, "next", "The terminal maintenance route must not enter locale negotiation");
result = runMiddleware("/api", { acceptLanguage: "en" });
assert.equal(result.response.kind, "json", "Maintenance mode must include the exact API namespace root");
assert.equal(result.response.status, 503);
if (originalCutoverMode === undefined) delete process.env.NEXT_PUBLIC_YOLMOD_CUTOVER_MODE;
else process.env.NEXT_PUBLIC_YOLMOD_CUTOVER_MODE = originalCutoverMode;

const originalWarn = console.warn;
const warnings = [];
console.warn = (message) => warnings.push(message);
tr.__i18nRegression = { fallback: "Turkish fallback" };
en.__i18nRegression = {};
assert.equal(dictionaries.t("en", "__i18nRegression.fallback"), "Turkish fallback");
assert.equal(dictionaries.t("en", "__i18nRegression.fallback"), "Turkish fallback");
assert.equal(dictionaries.t("en", "missing.key"), tr.common.translationUnavailable, "Missing keys must never reach users as raw keys");
console.warn = originalWarn;
delete tr.__i18nRegression;
delete en.__i18nRegression;
assert.equal(warnings.filter((message) => message.includes("en:__i18nRegression.fallback")).length, 1, "Missing-key warnings must be deduplicated");

console.log("I18N-01 foundation tests passed.");
