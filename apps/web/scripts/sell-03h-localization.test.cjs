const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const configSource = read(projectRoot, "src", "i18n", "config.ts");
const copySource = read(projectRoot, "src", "app", "sell", "sell-copy.ts");
const wizard = read(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const page = read(projectRoot, "src", "app", "sell", "page.tsx");

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
const production = loadModule(copySource, (request) => {
  if (request === "@/i18n/config") return config;
  throw new Error(`Unexpected production-helper dependency: ${request}`);
});
const { getSellCopy, getVariantUploadStatus } = production;
const tr = getSellCopy("tr");
const en = getSellCopy("en");

assert.equal(getSellCopy("de"), tr, "Unsupported locale must use the application Turkish fallback");
assert.equal(getSellCopy(), tr, "Missing locale must use the application Turkish fallback");
assert.equal(getSellCopy("EN-us"), en, "Locale normalization must follow the application convention");

function shape(value) {
  if (Array.isArray(value)) return [value.length, ...value.map(shape)];
  if (typeof value === "function") return "function";
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])]));
  }
  return typeof value;
}
assert.deepEqual(shape(en), shape(tr), "TR and EN sell copy must expose the same typed contract");

const englishText = Object.values(en).flatMap((value) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}).join("\n");
assert.doesNotMatch(englishText, /[çğıİöşüÇĞÖŞÜ]/, "English sell copy must not contain Turkish-character leakage");

// Create, edit/rejected, success, safe errors, validation, and async states.
assert.equal(tr.publish, "İlanı yayınla");
assert.equal(en.publish, "Publish listing");
assert.equal(tr.resubmitButton, "Kaydet ve incelemeye gönder");
assert.equal(en.resubmitButton, "Save and send for review");
assert.equal(tr.rejectionReasonHeading, "Reddedilme nedeni");
assert.equal(en.rejectionReasonHeading, "Reason for rejection");
assert.equal(tr.successTitle, "İlanınız alındı");
assert.equal(en.successTitle, "Listing received");
assert.equal(tr.vehicleSaveFailure, "Araç bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
assert.equal(en.vehicleSaveFailure, "Vehicle information could not be saved. Please try again.");
assert.equal(tr.requiredVehicleIdentity, "Marka, model ve yıl alanlarını doldurun.");
assert.equal(en.requiredVehicleIdentity, "Complete the make, model, and year fields.");
assert.equal(tr.checkingSession, "Oturum kontrol ediliyor");
assert.equal(en.checkingSession, "Checking session");
assert.equal(getVariantUploadStatus(tr, "thumb"), "Küçük önizleme yükleniyor");
assert.equal(getVariantUploadStatus(en, "thumb"), "Thumbnail uploading");

// Exact original leak regression: HEAD rendered this literal in EN on step 1.
assert.ok(!wizard.includes('<Panel title="Satıcı bilgileri">'));
assert.ok(wizard.includes("<Panel title={copy.sellerInformation}>") );

// The provider locale drives all copy; stored enum values remain unchanged while labels are localized.
assert.ok(wizard.includes("const copy = getSellCopy(locale)"));
assert.ok(!wizard.includes("useI18n"), "SellWizard must consume the server-normalized locale prop");
assert.ok(!wizard.includes('locale === "en" ?'));
for (const wiring of [
  'value="used">{conditionLabel("used", locale)}',
  "fuelLabel(option, locale)",
  "transmissionLabel(option, locale)",
  "bodyTypeLabel(option, locale)",
  "driveTypeLabel(option, locale)",
  "damageStateLabel(option, locale)",
  "colorLabel(option, locale)",
  'value="private">{sellerTypeLabel("private", locale)}'
]) assert.ok(wizard.includes(wiring), `Missing localized enum-label wiring: ${wiring}`);
for (const storedValue of ['"gasoline"', '"automatic"', '"heavy_damage"', '"private"', '"used"']) {
  assert.ok(wizard.includes(storedValue), `Stored enum value changed or disappeared: ${storedValue}`);
}

// Catalog/user data remains direct, and server/client unavailable states share the same helper.
assert.ok(wizard.includes("{make.make_name}"));
assert.ok(wizard.includes("{model.model_name}"));
assert.ok(wizard.includes("state.description || copy.noSellerDescription"));
assert.ok(page.includes("const sellCopy = getSellCopy(locale)"));
assert.ok(page.includes("message={sellCopy.listingUnavailable}"));
assert.ok(page.includes("locale={locale}"), "The server-derived locale must be passed to SellWizard");
assert.ok(wizard.includes('localizePath("/login", locale)'));
assert.ok(wizard.includes('localizePath("/sell", locale)'));
assert.ok(wizard.includes('localizePath("/terms", locale)'));
assert.ok(wizard.includes('localizePath("/listing-rules", locale)'));

const wizardTurkishLines = wizard.split(/\r?\n/).filter((line) => /[çğıİöşüÇĞÖŞÜ]/.test(line));
assert.deepEqual(wizardTurkishLines.map((line) => line.trim()), [
  'const fallbackCityOptions = ["İstanbul", "Ankara", "İzmir", "Antalya"];',
  'city: "İstanbul",',
  'const usesFallbackCatalogOption = selectedMake?.make_name === "Diğer" || selectedModel?.model_name === "Diğer";'
], "Only catalog/proper-name Turkish literals may remain in SellWizard");

console.log("SELL-03H sell-flow localization tests passed.");
