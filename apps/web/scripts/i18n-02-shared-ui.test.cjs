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
const localeSwitch = load(read("src", "components", "layout", "locale-switch.ts"), "locale-switch.ts", (request) => {
  if (request === "@/i18n/config") return config;
  throw new Error(`Unexpected locale switch dependency: ${request}`);
});
const sharedCopy = load(read("src", "i18n", "global-launch-shared-copy.ts"), "global-launch-shared-copy.ts").globalLaunchSharedCopy;
const market = load(read("src", "lib", "market.ts"), "market.ts");
const middleware = load(read("src", "middleware.ts"), "middleware.ts", (request) => {
  if (request === "next/server") {
    return {
      NextResponse: {
        next: (options) => ({ kind: "next", options, cookies: { set() {} } }),
        redirect: (url) => ({ kind: "redirect", url: url.toString(), cookies: { set() {} } }),
        rewrite: (url, options) => ({ kind: "rewrite", url: url.toString(), options, cookies: { set() {} } }),
        json: () => ({ kind: "json", cookies: { set() {} } })
      }
    };
  }
  if (request === "./i18n/config") return config;
  throw new Error(`Unexpected middleware dependency: ${request}`);
});

function middlewareRequest(pathname, { locale, acceptLanguage } = {}) {
  const url = new URL(pathname, "https://otoyali.example");
  url.clone = () => new URL(url);
  return {
    url: url.toString(),
    nextUrl: url,
    headers: new Headers(acceptLanguage ? { "accept-language": acceptLanguage } : {}),
    cookies: {
      get: (name) => (name === config.LOCALE_COOKIE_NAME && locale ? { value: locale } : undefined),
      set() {}
    }
  };
}

assert.deepEqual(config.SUPPORTED_LOCALES, ["en", "ru", "kk", "zh-CN"]);
assert.equal(config.getLocaleSwitchPath("/#kategoriler", "en"), "/en#kategoriler");
assert.equal(config.getLocaleSwitchPath("/en#kategoriler", "ru"), "/#kategoriler");
assert.equal(config.getLocaleSwitchPath("/servisler/basvuru?city=Astana#hours", "en"), "/en/servisler/basvuru?city=Astana#hours");
assert.equal(config.getLocaleSwitchPath("/en/servisler/basvuru?city=Astana#hours", "ru"), "/servisler/basvuru?city=Astana#hours");
assert.equal(config.getLocaleSwitchPath("/search?q=tesla", "kk"), "/kk/search?q=tesla");
assert.equal(config.getLocaleSwitchPath("/kk/search?q=tesla", "zh-CN"), "/zh-CN/search?q=tesla");
assert.equal(config.getLocaleSwitchPath("/about", "en"), "/en/about");
assert.equal(config.getLocaleSwitchPath("https://attacker.example", "en"), "/");
for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  assert.match(sharedCopy[locale].common.language, /\S/);
  assert.match(sharedCopy[locale].navigation.buyVehicle, /\S/);
  assert.match(sharedCopy[locale].common.adminPanel, /\S/);
}
assert.equal(market.CURRENT_MARKET.id, "kazakhstan");
assert.equal(market.CURRENT_MARKET.currencyCode, "KZT");

let request = middlewareRequest("/about", { locale: "tr", acceptLanguage: "en" });
let response = middleware.middleware(request);
assert.equal(response.kind, "redirect", "An unreleased Turkish preference is ignored in favor of a released language");
assert.equal(new URL(response.url).pathname, "/en/about");
request = middlewareRequest("/about", { locale: "ru", acceptLanguage: "en" });
response = middleware.middleware(request);
assert.equal(response.kind, "next", "A released Russian preference is preserved as the default locale");
assert.equal(response.options.request.headers.get(config.LOCALE_HEADER_NAME), "ru");
request = middlewareRequest("/about", { locale: "zh-CN", acceptLanguage: "zh-CN" });
response = middleware.middleware(request);
assert.equal(response.kind, "next");
assert.equal(response.options.request.headers.get(config.LOCALE_HEADER_NAME), "zh-CN");

const callOrder = [];
let cookieValue = "";
const originalDocument = global.document;
const originalWindow = global.window;

global.document = {
  set cookie(value) {
    cookieValue = value;
    callOrder.push("cookie");
  }
};
global.window = {
  location: {
    protocol: "https:",
    assign(href) {
      callOrder.push(`navigate:${href}`);
    }
  }
};

try {
  assert.equal(localeSwitch.persistLocaleAndNavigate("en", "/about?source=header#details"), true);
  assert.deepEqual(callOrder, ["cookie", "navigate:/en/about?source=header#details"], "Preference persistence must occur before the only navigation");
  assert.equal(cookieValue, `${config.LOCALE_COOKIE_NAME}=en; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);

  callOrder.length = 0;
  cookieValue = "";
  assert.equal(localeSwitch.persistLocaleAndNavigate("ru", "/about#details"), true);
  assert.deepEqual(callOrder, ["cookie", "navigate:/about#details"], "Russian must be persisted and navigated as the default locale");
  assert.equal(cookieValue, `${config.LOCALE_COOKIE_NAME}=ru; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);

  callOrder.length = 0;
  cookieValue = "";
  assert.equal(localeSwitch.persistLocaleAndNavigate("tr", "/about#details"), false);
  assert.deepEqual(callOrder, [], "Unreleased locales must not be persisted or navigated");
  assert.equal(cookieValue, "");

  assert.equal(localeSwitch.getLocationHref("/page-a", "view=grid", "#old"), "/page-a?view=grid#old");
  assert.equal(localeSwitch.getLocationHref("/page-b", "sort=recent", "#new"), "/page-b?sort=recent#new", "A retained switcher uses the live hash after route/search changes");
  assert.equal(localeSwitch.getLocationHref("/page-b", "", ""), "/page-b", "No-hash URLs remain unchanged");

  callOrder.length = 0;
  assert.equal(localeSwitch.persistLocaleAndNavigate("en", "https://attacker.example"), true);
  assert.deepEqual(callOrder, ["cookie", "navigate:/"], "Navigation must stay on an internal safe target");
} finally {
  global.document = originalDocument;
  global.window = originalWindow;
}

const switcher = read("src", "components", "layout", "LanguageSwitcher.tsx");
assert.match(switcher, /SUPPORTED_LOCALES\.map/);
assert.match(switcher, /window\.location\.hash/);
assert.match(switcher, /setHash\(window\.location\.hash\);\s*}, \[pathname, query\]\)/, "Route and query changes must resynchronize the rendered hash");
assert.match(switcher, /persistLocaleAndNavigate\(nextLocale, getLocationHref\(pathname, query, window\.location\.hash\)\)/, "Switch activation must use the live hash");
assert.match(switcher, /event\.preventDefault\(\);\s*switchLocale\(candidate\);/, "The switcher must prevent Next.js soft navigation");
assert.doesNotMatch(switcher, /from "next\/link"|\brouter\.(?:push|replace)\b/, "Language switching must not use Next.js client navigation");
assert.match(switcher, /candidate === locale \? \(/, "The current locale must not be a reloadable link");
assert.match(read("src", "components", "layout", "AppHeader.tsx"), /<LanguageSwitcher/, "Header must render the shared switcher");
assert.match(read("src", "components", "layout", "MarketplaceFooter.tsx"), /<LanguageSwitcher/, "Footer must render the shared switcher");
assert.doesNotMatch(switcher, /\btr\b|العربية/);

const shareListing = read("src", "app", "listing", "[id]", "_components", "ShareListingButton.tsx");
assert.match(shareListing, /getListingActionsCopy/);
assert.match(shareListing, /copy\.copied/);
assert.doesNotMatch(shareListing, /locale === "en"/);

console.log("I18N-02 shared UI tests passed.");
