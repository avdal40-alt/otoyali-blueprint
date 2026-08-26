const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const configSource = read(projectRoot, "src", "i18n", "config.ts");
const sellCopySource = read(projectRoot, "src", "app", "sell", "sell-copy.ts");
const listingsCopySource = read(projectRoot, "src", "app", "profile", "listings", "my-listings-copy.ts");
const wizard = read(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const listings = read(projectRoot, "src", "app", "profile", "listings", "_components", "MyListingsClient.tsx");
const publicPage = read(projectRoot, "src", "app", "my-listings", "page.tsx");
const profilePage = read(projectRoot, "src", "app", "profile", "listings", "page.tsx");

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
}

function loadModule(source, requireImpl = require) {
  const module = { exports: {} };
  new Function("exports", "module", "require", transpile(source))(module.exports, module, requireImpl);
  return module.exports;
}

const config = loadModule(configSource);
const dependencyResolver = (request) => {
  if (request === "@/i18n/config") return config;
  throw new Error(`Unexpected production-helper dependency: ${request}`);
};
const sellProduction = loadModule(sellCopySource, dependencyResolver);
const listingsProduction = loadModule(listingsCopySource, dependencyResolver);
const { getSellCatalogDisplayName } = sellProduction;
const { getMyListingsCopy, getMyListingsLifecycleErrorMessage } = listingsProduction;

// The real model view shape includes both parent make and model names. Rendering is kind-explicit.
const teslaMake = { make_name: "Tesla", make_slug: "tesla" };
const cybertruck = { make_name: "Tesla", model_name: "Cybertruck", model_slug: "cybertruck" };
const model3 = { make_name: "Tesla", model_name: "Model 3", model_slug: "model-3" };
const otherTeslaModel = { make_name: "Tesla", model_name: "Diğer", model_slug: "diger" };
const sahin = { make_name: "Tofaş", model_name: "Şahin", model_slug: "sahin" };

assert.equal(getSellCatalogDisplayName({ kind: "make", item: teslaMake, locale: "en" }), "Tesla");
assert.equal(getSellCatalogDisplayName({ kind: "model", item: cybertruck, locale: "en" }), "Cybertruck");
assert.equal(getSellCatalogDisplayName({ kind: "model", item: model3, locale: "en" }), "Model 3");
assert.equal(getSellCatalogDisplayName({ kind: "model", item: otherTeslaModel, locale: "tr" }), "Diğer");
assert.equal(getSellCatalogDisplayName({ kind: "model", item: otherTeslaModel, locale: "en" }), "Other");
assert.equal(getSellCatalogDisplayName({ kind: "model", item: sahin, locale: "en" }), "Şahin");
assert.ok(sellCopySource.includes('input.kind === "make"'));
assert.ok(!sellCopySource.includes("item.make_name ?? item.model_name"), "Property-order inference must never select a model label");
assert.ok(wizard.includes('{getSellCatalogDisplayName({ kind: "make", item: make, locale })}'));
assert.ok(wizard.includes('{getSellCatalogDisplayName({ kind: "model", item: model, locale })}'));

// Display-only copy cannot enter canonical title or persistence paths.
assert.ok(wizard.includes("makeName: selectedMake?.make_name"));
assert.ok(wizard.includes("selectedModel.model_name"));
assert.ok(wizard.includes("title: generatedTitle"));
assert.ok(!wizard.includes("getSellCatalogDisplayName({ kind: \"model\", item: selectedModel"));

function shape(value) {
  if (Array.isArray(value)) return [value.length, ...value.map(shape)];
  if (typeof value === "function") return "function";
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])]));
  }
  return typeof value;
}

const tr = getMyListingsCopy("tr");
const en = getMyListingsCopy("en");
assert.equal(getMyListingsCopy(), tr, "Missing locale follows DEFAULT_LOCALE");
assert.equal(getMyListingsCopy("de"), tr, "Unsupported locale follows DEFAULT_LOCALE");
assert.equal(getMyListingsCopy("EN-us"), en, "Locale normalization follows the request locale convention");
assert.deepEqual(shape(en), shape(tr), "TR and EN My Listings copy expose identical contracts");

assert.equal(en.statusRejected, "Rejected");
assert.equal(en.statusArchived, "Archived");
assert.equal(en.statusPendingReview, "Pending review");
assert.equal(en.statusActive, "Active");
assert.equal(en.statusPaused, "Paused");
assert.equal(en.statusDraft, "Draft");
assert.equal(en.listingQuality, "Listing quality");
assert.equal(en.previewComingSoon, "Preview · Coming soon");
assert.equal(en.resubmitForReview, "Resubmit for review");
assert.equal(en.statusArchivedBody, "This listing has been removed from publication and is not visible on public pages.");
assert.equal(en.loadFailure, "Your listings could not be loaded. Please try again.");
assert.equal(en.mutationFailure, "Listing status could not be updated. Please try again.");
assert.equal(getMyListingsLifecycleErrorMessage({ code: "OT409", message: "provider detail" }, en), en.listingStateChanged);
assert.equal(getMyListingsLifecycleErrorMessage({ message: "provider detail" }, tr), tr.mutationFailure);

// Exact final-gate regression: active language-independent UI cannot contain the old literals.
for (const oldLiteral of ["Reddedildi", "Arşivlendi", "İlan kalitesi", "Önizle · Yakında", "Tekrar incelemeye gönder"]) {
  assert.ok(!listings.includes(oldLiteral), `MyListingsClient reintroduced browser blocker: ${oldLiteral}`);
}
assert.doesNotMatch(listings, /[çğıİöşüÇĞÖŞÜ]/, "Turkish UI belongs in the typed TR copy, not the locale-independent client");
for (const key of [
  "statusRejected", "statusArchived", "statusPendingReview", "listingQuality", "previewComingSoon",
  "resubmitForReview", "statusArchivedBody", "loadFailure", "mutationFailure", "loading"
]) {
  assert.ok(listings.includes(`copy.${key}`) || listingsCopySource.includes(`${key}:`), `Missing production copy wiring: ${key}`);
}

// Mutation failures and post-success refresh failures retain separate safe message ownership.
assert.ok(listings.includes('outcome.kind === "mutation-failed"'));
assert.ok(listings.includes("lifecycleErrorMessage(outcome.error, locale)"));
assert.ok(listings.includes('outcome.kind === "mutation-succeeded-refresh-failed"'));
assert.ok(listings.includes("listingLoadErrorMessage(locale)"));
assert.ok(!listings.includes("error.message"));
assert.ok(!listings.includes("error.details"));
assert.ok(!listings.includes("error.hint"));
assert.ok(!listings.includes("JSON.stringify(error)"));

// Both real server routes pass the normalized request locale; no profile locale is consulted.
for (const page of [publicPage, profilePage]) {
  assert.ok(page.includes("const locale = await getRequestLocale()"));
  assert.ok(page.includes("<MyListingsClient locale={locale} />"));
}
assert.ok(listings.includes("export function MyListingsClient({ locale }: { locale: Locale })"));
assert.ok(!listings.includes("useI18n"));
assert.ok(!listings.includes("profile.language"));
assert.ok(!listings.includes("window.location"));
assert.ok(!listings.includes("document.cookie"));

console.log("SELL-03I final browser-blocker regression tests passed.");
