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
const tr = load(read("src", "i18n", "dictionaries", "tr.ts"), "tr.ts").tr;
const en = load(read("src", "i18n", "dictionaries", "en.ts"), "en.ts").en;
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

assert.deepEqual(config.SUPPORTED_LOCALES, ["tr", "en"]);
assert.equal(config.getLocaleSwitchPath("/#kategoriler", "en"), "/en#kategoriler");
assert.equal(config.getLocaleSwitchPath("/en#kategoriler", "tr"), "/#kategoriler");
assert.equal(config.getLocaleSwitchPath("/servisler/basvuru?city=Ankara#hours", "en"), "/en/services/apply?city=Ankara#hours");
assert.equal(config.getLocaleSwitchPath("/en/services/apply?city=Ankara#hours", "tr"), "/servisler/basvuru?city=Ankara#hours");
assert.equal(config.getLocaleSwitchPath("/ikinci-el-araba?q=tesla", "en"), "/en/used-cars?q=tesla");
assert.equal(config.getLocaleSwitchPath("/en/used-cars?q=tesla", "tr"), "/ikinci-el-araba?q=tesla");
assert.equal(config.getLocaleSwitchPath("/about", "en"), "/en/about");
assert.equal(config.getLocaleSwitchPath("https://attacker.example", "en"), "/");
assert.equal(tr.common.language, "Dil");
assert.equal(en.common.language, "Language");
assert.equal(tr.navigation.buyVehicle, "Araç al");
assert.equal(en.navigation.buyVehicle, "Buy a vehicle");
assert.equal(tr.search.closeFilters, "Filtreleri kapat");
assert.equal(en.search.closeFilters, "Close filters");
assert.equal(market.CURRENT_MARKET.id, "turkey");
assert.equal(market.CURRENT_MARKET.currencyCode, "TRY");

let request = middlewareRequest("/about", { locale: "tr", acceptLanguage: "en" });
let response = middleware.middleware(request);
assert.equal(response.kind, "next", "An explicit Turkish preference wins over Accept-Language");
assert.equal(response.options.request.headers.get(config.LOCALE_HEADER_NAME), "tr");
request = middlewareRequest("/about", { locale: "ru", acceptLanguage: "en" });
response = middleware.middleware(request);
assert.equal(response.kind, "redirect", "An unreleased preference is ignored instead of blocking English negotiation");
assert.equal(new URL(response.url).pathname, "/en/about");
request = middlewareRequest("/about", { locale: "zh-CN", acceptLanguage: "zh-CN" });
response = middleware.middleware(request);
assert.equal(response.kind, "next");
assert.equal(response.options.request.headers.get(config.LOCALE_HEADER_NAME), "tr");

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
  assert.equal(localeSwitch.persistLocaleAndNavigate("ru", "/about#details"), false);
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
assert.doesNotMatch(switcher, /\bru\b|zh-CN|العربية/);

console.log("I18N-02 shared UI tests passed.");
