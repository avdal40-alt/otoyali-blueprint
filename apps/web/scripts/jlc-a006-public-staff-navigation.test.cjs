const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

function loadModule(source, filename, mocks = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (request) => mocks[request] ?? require(request),
  }, { filename });
  return module.exports;
}

const jsx = (type, props, key) => ({ type, props: { ...props, key } });
const react = { useEffect: () => {}, useState: (value) => [value, () => {}] };
const reactJsxRuntime = { jsx, jsxs: jsx, Fragment: Symbol("Fragment") };
const Link = () => null;
const ButtonLink = () => null;
const EmptyState = () => null;
const LanguageSwitcher = () => null;
const { globalLaunchSharedCopy } = loadModule(
  read("src", "i18n", "global-launch-shared-copy.ts"),
  "global-launch-shared-copy.ts",
);
const staffModule = loadModule(
  read("src", "lib", "auth", "platform-staff.ts"),
  "platform-staff.ts",
);

let staffState = "unknown";
let activeI18n = { locale: "ru", dictionary: globalLaunchSharedCopy.ru };
const baseMocks = {
  react,
  "react/jsx-runtime": reactJsxRuntime,
  "next/link": { __esModule: true, default: Link },
  "next/navigation": { usePathname: () => "/" },
  "@/components/ui/Button": { ButtonLink },
  "@/components/ui/States": { EmptyState },
  "@/components/layout/PlatformStaffNavigation": {
    platformStaffNavigationAction: staffModule.platformStaffNavigationAction,
    usePlatformStaffNavigation: () => staffState,
  },
  "./PlatformStaffNavigation": {
    platformStaffNavigationAction: staffModule.platformStaffNavigationAction,
    usePlatformStaffNavigation: () => staffState,
  },
  "./LanguageSwitcher": { LanguageSwitcher },
  "@/lib/supabase/client": {
    getSupabaseBrowserClient: () => ({ auth: { getSession: async () => ({ data: {} }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } }),
    hasSupabaseEnv: () => false,
  },
  "@/i18n/config": { localizePath: (href) => href },
  "@/i18n/client": { useI18n: () => activeI18n },
  "@/lib/market": { ACTIVE_MARKET_PROFILE: { brandName: "Jolmod" } },
  "@/i18n/jolmod-legal-documents": { getJolmodLegalDocument: (key) => ({ title: key }) },
};

function loadSurface(file) {
  return loadModule(read("src", ...file.split("/")), file, baseMocks);
}

const { AppHeader } = loadSurface("components/layout/AppHeader.tsx");
const { MarketplaceFooter } = loadSurface("components/layout/MarketplaceFooter.tsx");
const { MobileBottomNav } = loadSurface("components/layout/MobileBottomNav.tsx");
const { HomeMarketplaceAction } = loadSurface("components/home/HomeMarketplaceAction.tsx");
const { MarketplaceListingEmptyState } = loadSurface("components/vehicle/MarketplaceListingEmptyState.tsx");

function nodes(node, predicate, found = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => nodes(item, predicate, found));
    return found;
  }
  if (!node || typeof node !== "object") return found;
  if (predicate(node)) found.push(node);
  nodes(node.props?.children, predicate, found);
  return found;
}

function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  return text(node.props?.children);
}

function actionNodes(tree) {
  return nodes(tree, (node) => node.props?.href === "/admin" || node.props?.href === "/sell");
}

function assertAction(tree, expectedHref, expectedLabel, surface) {
  const actions = actionNodes(tree);
  assert.equal(actions.length, 1, `${surface} must expose exactly one staff/seller entry action`);
  assert.equal(actions[0].props.href, expectedHref, `${surface} must route the resolved action correctly`);
  assert.equal(text(actions[0]) || actions[0].props.action, expectedLabel, `${surface} must use localized action wording`);
}

function renderHome(locale) {
  return HomeMarketplaceAction({
    locale,
    sellTitle: "Sell title",
    sellBody: "Sell body",
    sellerLabel: String(globalLaunchSharedCopy[locale].common.publishListing),
    adminLabel: String(globalLaunchSharedCopy[locale].common.adminPanel),
    adminBody: "Admin body",
  });
}

function renderListingEmptyState(locale) {
  return MarketplaceListingEmptyState({
    locale,
    title: "No listings",
    body: "Try again later",
  });
}

for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const dictionary = globalLaunchSharedCopy[locale];
  assert.match(String(dictionary.common.adminPanel), /\S/, `${locale} must provide admin navigation copy`);
  assert.match(String(dictionary.common.publishListing), /\S/, `${locale} must provide seller navigation copy`);
  activeI18n = { locale, dictionary };

  staffState = "staff";
  assertAction(AppHeader(), "/admin", String(dictionary.common.adminPanel), `desktop header (${locale})`);
  assertAction(MobileBottomNav(), "/admin", String(dictionary.common.adminPanel), `mobile navigation (${locale})`);
  assertAction(MarketplaceFooter(), "/admin", String(dictionary.common.adminPanel), `footer (${locale})`);
  assertAction(renderHome(locale), "/admin", String(dictionary.common.adminPanel), `homepage CTA (${locale})`);
  assertAction(renderListingEmptyState(locale), "/admin", String(dictionary.common.adminPanel), `listing empty state (${locale})`);

  for (const state of ["anonymous", "not_staff"]) {
    staffState = state;
    assertAction(AppHeader(), "/sell", String(dictionary.common.publishListing), `desktop header ${state} (${locale})`);
    assertAction(MobileBottomNav(), "/sell", String(dictionary.common.publishListing), `mobile navigation ${state} (${locale})`);
    assertAction(MarketplaceFooter(), "/sell", String(dictionary.footer.sell), `footer ${state} (${locale})`);
    assertAction(renderHome(locale), "/sell", String(dictionary.common.publishListing), `homepage CTA ${state} (${locale})`);
    assertAction(renderListingEmptyState(locale), "/sell", String(dictionary.common.publishListing), `listing empty state ${state} (${locale})`);
  }

  staffState = "unknown";
  for (const [surface, tree] of [
    ["desktop header", AppHeader()],
    ["mobile navigation", MobileBottomNav()],
    ["footer", MarketplaceFooter()],
    ["homepage CTA", renderHome(locale)],
    ["listing empty state", renderListingEmptyState(locale)],
  ]) {
    assert.equal(actionNodes(tree).length, 0, `${surface} must fail closed while staff state is unresolved`);
  }
  assert.equal(renderHome(locale).props["aria-busy"], "true", `homepage CTA (${locale}) must expose its resolving state`);
}

assert.equal(staffModule.platformStaffNavigationAction("staff"), "admin");
assert.equal(staffModule.platformStaffNavigationAction("not_staff"), "seller");
assert.equal(staffModule.platformStaffNavigationAction("anonymous"), "seller");
assert.equal(staffModule.platformStaffNavigationAction("unknown"), null);

console.log("JLC-A006 public/staff navigation contract passed");
