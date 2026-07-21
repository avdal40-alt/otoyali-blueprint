const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const moduleCache = new Map();

function loadTsModule(sourcePath) {
  const resolvedPath = sourcePath.endsWith(".ts") ? sourcePath : `${sourcePath}.ts`;
  if (moduleCache.has(resolvedPath)) return moduleCache.get(resolvedPath).exports;

  const source = fs.readFileSync(resolvedPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolvedPath
  }).outputText;

  const module = { exports: {} };
  moduleCache.set(resolvedPath, module);

  function localRequire(specifier) {
    if (specifier.startsWith("@/")) {
      return loadTsModule(path.join(srcRoot, specifier.slice(2)));
    }

    if (specifier.startsWith(".")) {
      return loadTsModule(path.resolve(path.dirname(resolvedPath), specifier));
    }

    return require(specifier);
  }

  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}

const { buildPhoneSignupMetadata, sanitizeSignupTimezone } = loadTsModule(path.join(srcRoot, "lib", "auth", "signup-metadata"));
const { createOtpPhoneTransaction, readOtpPhoneTransaction, saveOtpPhoneTransaction, clearOtpPhoneTransaction } = loadTsModule(path.join(srcRoot, "lib", "auth", "otp-transaction"));
const { parseAuthPhoneNumber } = loadTsModule(path.join(srcRoot, "lib", "auth", "phone"));
const migrationPath = path.resolve(projectRoot, "..", "..", "supabase", "migrations", "20260721130000_auth03_validated_signup_metadata.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const sellWizardSource = fs.readFileSync(path.join(srcRoot, "app", "sell", "_components", "SellWizard.tsx"), "utf8");

function metadata(input) {
  return buildPhoneSignupMetadata({
    selectedCountry: input.country,
    locale: input.locale,
    resolveTimeZone: () => input.timezone
  });
}

function assertMetadataKeys(value, expectedKeys) {
  assert.deepEqual(Object.keys(value).sort(), expectedKeys.sort());
}

assert.deepEqual(metadata({ country: "KZ", locale: "tr", timezone: "Asia/Almaty" }), {
  country: "KZ",
  language: "tr",
  timezone: "Asia/Almaty"
});
assert.deepEqual(metadata({ country: "RU", locale: "tr", timezone: "Europe/Moscow" }), {
  country: "RU",
  language: "tr",
  timezone: "Europe/Moscow"
});
assert.deepEqual(metadata({ country: "TR", locale: "tr", timezone: "Europe/Istanbul" }), {
  country: "TR",
  language: "tr",
  timezone: "Europe/Istanbul"
});
assert.deepEqual(metadata({ country: "US", locale: "en", timezone: "America/New_York" }), {
  country: "US",
  language: "en",
  timezone: "America/New_York"
});
assert.deepEqual(metadata({ country: "CA", locale: "en", timezone: "America/Toronto" }), {
  country: "CA",
  language: "en",
  timezone: "America/Toronto"
});

assert.equal(metadata({ country: "KZ", locale: "tr", timezone: "Asia/Almaty" }).country, "KZ");
assert.equal(metadata({ country: "RU", locale: "tr", timezone: "Europe/Moscow" }).country, "RU");
assert.equal(metadata({ country: "US", locale: "en", timezone: "America/New_York" }).country, "US");
assert.equal(metadata({ country: "CA", locale: "en", timezone: "America/Toronto" }).country, "CA");

assert.equal(metadata({ country: "TR", locale: "tr", timezone: "Europe/Istanbul" }).language, "tr");
assert.equal(metadata({ country: "US", locale: "en", timezone: "America/New_York" }).language, "en");
assert.equal(metadata({ country: "KZ", locale: "de", timezone: "Asia/Almaty" }).language, "tr");
assert.equal(metadata({ country: "KZ", locale: "ru-KZ", timezone: "Asia/Almaty" }).language, "tr");

assert.equal(metadata({ country: "KZ", locale: "tr", timezone: "Asia/Almaty" }).timezone, "Asia/Almaty");
assert.equal(metadata({ country: "TR", locale: "tr", timezone: "Europe/Istanbul" }).timezone, "Europe/Istanbul");
assert.equal(sanitizeSignupTimezone("Asia/Aqtobe"), "Asia/Aqtobe");
assert.equal(sanitizeSignupTimezone("Europe/Berlin"), "Europe/Berlin");
assert.equal(sanitizeSignupTimezone("America/New_York"), "America/New_York");
assert.equal(sanitizeSignupTimezone(undefined), null);
assert.equal(sanitizeSignupTimezone(""), null);
assert.equal(sanitizeSignupTimezone("Asia/Almaty\n"), null);
assert.equal(sanitizeSignupTimezone(" Asia/Almaty"), null);
assert.equal(sanitizeSignupTimezone("+05:00"), null);
assert.equal(sanitizeSignupTimezone("Not a zone"), null);

const metadataWithoutTimezone = metadata({ country: "KZ", locale: "en", timezone: undefined });
assert.deepEqual(metadataWithoutTimezone, { country: "KZ", language: "en" });
assertMetadataKeys(metadata({ country: "KZ", locale: "tr", timezone: "Asia/Almaty" }), ["country", "language", "timezone"]);
assertMetadataKeys(metadataWithoutTimezone, ["country", "language"]);
assert.equal(metadata({ country: "ZZ", locale: "tr", timezone: "UTC" }), null);
assert.equal(metadata({ country: "kz", locale: "tr", timezone: "UTC" }), null);

const forbiddenKeys = ["phone", "id", "user_id", "role", "admin", "permissions", "otp", "token", "next", "raw"];
const sampleMetadata = metadata({ country: "CA", locale: "en", timezone: "America/Toronto" });
for (const key of forbiddenKeys) {
  assert.equal(Object.prototype.hasOwnProperty.call(sampleMetadata, key), false, `${key} must not be sent`);
}

assert.equal(parseAuthPhoneNumber("0555 123 45 67", "TR").e164, "+905551234567");
assert.equal(parseAuthPhoneNumber("+7 701 123 45 67", "TR").country, "KZ");
assert.equal(parseAuthPhoneNumber("+7 916 123 45 67", "TR").country, "RU");
assert.equal(parseAuthPhoneNumber("+1 415 555 2671", "TR").country, "US");
assert.equal(parseAuthPhoneNumber("+1 416 555 2671", "TR").country, "CA");

function normalizeAuthPhone(value) {
  if (value === null) return null;
  if (value === "") return null;
  if (/^\+[1-9][0-9]{1,14}$/.test(value)) return value;
  if (/^[1-9][0-9]{1,14}$/.test(value)) return `+${value}`;
  throw new Error("invalid profile phone format");
}

function validateDatabaseMetadata({ language, country, timezone }) {
  const knownTimezones = new Set(["Europe/Istanbul", "Asia/Almaty", "Asia/Aqtobe", "Europe/Berlin", "America/New_York", "UTC"]);
  const profileLanguage = language === "tr" || language === "en" ? language : "tr";
  const profileCountry = typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : "TR";
  const profileTimezone =
    typeof timezone === "string" &&
    timezone.length >= 1 &&
    timezone.length <= 80 &&
    !/[\u0000-\u001F\u007F]/.test(timezone) &&
    knownTimezones.has(timezone)
      ? timezone
      : profileCountry === "TR"
        ? "Europe/Istanbul"
        : "UTC";

  return {
    language: profileLanguage,
    country: profileCountry,
    timezone: profileTimezone
  };
}

assert.equal(normalizeAuthPhone("77470000000"), "+77470000000");
assert.equal(normalizeAuthPhone("905550000000"), "+905550000000");
assert.equal(normalizeAuthPhone("15550000000"), "+15550000000");
assert.equal(normalizeAuthPhone("+77470000000"), "+77470000000");
assert.equal(normalizeAuthPhone("+905550000000"), "+905550000000");
assert.equal(normalizeAuthPhone(null), null);
assert.equal(normalizeAuthPhone(""), null);
assert.throws(() => normalizeAuthPhone("077470000000"), /invalid profile phone format/);
assert.throws(() => normalizeAuthPhone("++77470000000"), /invalid profile phone format/);
assert.throws(() => normalizeAuthPhone("7 747 000 0000"), /invalid profile phone format/);
assert.throws(() => normalizeAuthPhone("phone"), /invalid profile phone format/);
assert.throws(() => normalizeAuthPhone("+1234567890123456"), /invalid profile phone format/);

assert.deepEqual(validateDatabaseMetadata({ language: "tr", country: "TR", timezone: "Europe/Istanbul" }), {
  language: "tr",
  country: "TR",
  timezone: "Europe/Istanbul"
});
assert.deepEqual(validateDatabaseMetadata({ language: "en", country: "KZ", timezone: "Asia/Almaty" }), {
  language: "en",
  country: "KZ",
  timezone: "Asia/Almaty"
});
assert.equal(validateDatabaseMetadata({ language: "de", country: "KZ", timezone: "Asia/Almaty" }).language, "tr");
assert.equal(validateDatabaseMetadata({ language: "", country: "TR", timezone: "Europe/Istanbul" }).language, "tr");
assert.equal(validateDatabaseMetadata({ language: "en", country: "KZ", timezone: "Mars/Base" }).timezone, "UTC");
assert.equal(validateDatabaseMetadata({ language: "en", country: "TR", timezone: "Mars/Base" }).timezone, "Europe/Istanbul");
assert.equal(validateDatabaseMetadata({ language: "en", country: "kz", timezone: "Asia/Almaty" }).country, "TR");
assert.equal(validateDatabaseMetadata({ language: "en", country: "KAZ", timezone: "Asia/Almaty" }).country, "TR");

assert.ok(migrationSql.includes("CREATE OR REPLACE FUNCTION identity.handle_new_user()"));
assert.ok(migrationSql.includes("SECURITY DEFINER"));
assert.ok(migrationSql.includes("SET search_path = identity, public, auth"));
assert.ok(migrationSql.includes("v_profile_language TEXT;"));
assert.ok(migrationSql.includes("v_profile_country TEXT;"));
assert.ok(migrationSql.includes("v_profile_timezone TEXT;"));
assert.ok(migrationSql.includes("FROM pg_catalog.pg_timezone_names AS timezone_name"));
assert.ok(migrationSql.includes("WHEN v_profile_country = 'TR' THEN 'Europe/Istanbul'"));
assert.ok(migrationSql.includes("ELSE 'UTC'"));
assert.ok(migrationSql.includes("RAISE EXCEPTION 'invalid profile phone format'"));
assert.ok(migrationSql.includes("USING ERRCODE = '22023'"));
assert.ok(migrationSql.indexOf("RAISE EXCEPTION 'invalid profile phone format'") < migrationSql.indexOf("INSERT INTO public.profiles"));
assert.ok(!migrationSql.includes("'phone', NEW.phone"));
assert.ok(!migrationSql.includes("'email', NEW.email"));
assert.ok(!migrationSql.includes("regexp_replace"));
assert.ok(!migrationSql.includes("GRANT "));
assert.ok(!migrationSql.includes("REVOKE "));
assert.ok(!migrationSql.includes("CREATE TRIGGER"));
assert.ok(sellWizardSource.includes("language: profile.language"));
assert.ok(sellWizardSource.includes("country: profile.country"));
assert.ok(sellWizardSource.includes("timezone: profile.timezone"));
assert.ok(!sellWizardSource.includes('language: "tr",\n        country: "TR",\n        timezone: "Europe/Istanbul"'));

const sessionStore = new Map();
const sessionStorage = {
  getItem: (key) => sessionStore.get(key) ?? null,
  setItem: (key, value) => sessionStore.set(key, value),
  removeItem: (key) => sessionStore.delete(key)
};
global.window = {
  sessionStorage
};
global.sessionStorage = sessionStorage;

const transaction = createOtpPhoneTransaction("+77011234567", "KZ");
saveOtpPhoneTransaction(transaction);
const storedTransaction = readOtpPhoneTransaction();
assert.equal(storedTransaction.phone, "+77011234567");
assert.equal(storedTransaction.country, "KZ");
assert.equal(typeof storedTransaction.createdAt, "number");
assert.equal(storedTransaction.expiresAt - storedTransaction.createdAt, 10 * 60 * 1000);
clearOtpPhoneTransaction();
assert.equal(readOtpPhoneTransaction(), null);

console.log("auth signup metadata tests passed");
