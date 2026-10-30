const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const source = read("src", "app", "admin", "_components", "admin-navigation-copy.ts");
const adminClient = read("src", "app", "admin", "_components", "AdminClient.tsx");
const loginClient = read("src", "app", "admin", "login", "_components", "AdminLoginClient.tsx");
const vehicleReviewClient = read("src", "app", "admin", "_components", "VehicleReviewModerationClient.tsx");
const loaded = { exports: {} };
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
new Function("exports", "module", output)(loaded.exports, loaded);

const { getAdminNavigationCopy } = loaded.exports;
const ru = getAdminNavigationCopy("ru");
const kk = getAdminNavigationCopy("kk");
const en = getAdminNavigationCopy("en");
const zhCN = getAdminNavigationCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(ru).sort(), `${locale} admin navigation shape`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} must use direct launch copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} must not contain placeholders`);
}

assert.equal(getAdminNavigationCopy("de"), ru, "Unsupported Jolmod locales must use Russian fallback");
assert.notEqual(getAdminNavigationCopy("tr"), ru, "Historical Turkish copy must not be Jolmod fallback");
assert.match(JSON.stringify(zhCN), /[\u4E00-\u9FFF]/, "zh-CN admin copy must contain Simplified Chinese");
assert.doesNotMatch(JSON.stringify(zhCN), /關|體|臺/, "zh-CN admin copy must not use Traditional Chinese placeholders");

assert.match(adminClient, /getAdminNavigationCopy/);
assert.doesNotMatch(adminClient, /dictionary\.admin/);
assert.match(loginClient, /getAuthCopy/);
assert.doesNotMatch(loginClient, /dictionary\.(auth|errors)/);
assert.match(loginClient, /supabase\.rpc\("is_admin"/);
assert.match(vehicleReviewClient, /useI18n/);
assert.match(vehicleReviewClient, /getVehicleReviewModerationCopy/);
assert.match(vehicleReviewClient, /locale === "kk" \|\| locale === "en" \|\| locale === "zh-CN"/);
assert.match(vehicleReviewClient, /return locale === "kk" \|\| locale === "en" \|\| locale === "zh-CN" \? copy\[locale\] : copy\.ru/);
assert.match(vehicleReviewClient, /<LoadingState/);
assert.match(vehicleReviewClient, /<EmptyState/);
assert.match(adminClient, /supabase\.rpc\("is_admin"/);

console.log("Admin client global-dictionary localization tests passed.");
