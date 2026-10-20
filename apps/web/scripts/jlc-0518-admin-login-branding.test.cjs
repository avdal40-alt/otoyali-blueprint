const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const returnPathSource = source("src/lib/auth/admin-return-path.ts");
const compiled = ts.transpileModule(
  `${source("src/lib/auth/return-path.ts").replace('export function safeNextPath', 'function safeNextPath')}\n${returnPathSource.replace('import { safeNextPath } from "./return-path";\n', "")}`,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;
const moduleUnderTest = { exports: {} };
new Function("require", "module", "exports", compiled)(require, moduleUnderTest, moduleUnderTest.exports);
const { safeAdminNextPath } = moduleUnderTest.exports;

assert.equal(safeAdminNextPath("/admin"), "/admin");
assert.equal(safeAdminNextPath("/admin/listings?filter=pending"), "/admin/listings?filter=pending");
for (const candidate of ["/login", "https://evil.example", "//evil.example", "/\\evil.example", "/%2Fevil.example", "/admin/%2Fevil.example"]) {
  assert.equal(safeAdminNextPath(candidate), "/admin", `${candidate} must not be an admin return path`);
}

const adminLogin = source("src/app/admin/login/_components/AdminLoginClient.tsx");
const adminPage = source("src/app/admin/login/page.tsx");
const adminClient = source("src/app/admin/_components/AdminClient.tsx");
const ordinaryLogin = source("src/app/login/_components/LoginClient.tsx");
const listingReviewRoute = source("src/app/api/admin/listings/review/route.ts");
const serviceReviewRoute = source("src/app/api/admin/service-applications/review/route.ts");

assert.ok(adminPage.includes("AdminLoginClient"));
assert.ok(adminLogin.includes("signInWithPassword"), "admin login must use password authentication");
assert.ok(adminLogin.includes('supabase.rpc("is_admin"'), "admin login must verify the existing admin RPC after authentication");
assert.ok(adminLogin.includes("router.replace(next)"), "authorized admins must return only to the safe admin path");
assert.ok(adminLogin.includes("Bu hesabın yönetim paneline erişim yetkisi yok."), "non-admins must receive an access-denied state");
assert.ok(adminLogin.includes("Farklı hesapla giriş yap"), "non-admins need a safe account-switch action");
assert.ok(!adminLogin.includes("signInWithOtp"), "normal admin sign-in must not send OTP");
assert.ok(adminClient.includes('router.replace(`/admin/login?next=${encodeURIComponent(next)}`)'), "unauthenticated admin navigation must use the dedicated login");
assert.ok(!adminClient.includes('localizePath("/login", locale)'), "admin client must not fall back to ordinary login");
assert.ok(ordinaryLogin.includes('safeNextPath(searchParams.get("next"), "/profile")'), "ordinary login return behavior must remain unchanged");
assert.ok(listingReviewRoute.includes("supabase.auth.getUser()") && listingReviewRoute.includes('supabase.rpc("review_listing_moderation"'), "listing review remains authenticated server-side");
assert.ok(serviceReviewRoute.includes("supabase.auth.getUser()") && serviceReviewRoute.includes('supabase.rpc("is_admin"'), "service review remains protected by its server-side admin check");

for (const relative of [
  "src/i18n/dictionaries/tr.ts",
  "src/i18n/dictionaries/en.ts",
  "src/app/admin/_components/AdminClient.tsx",
  "src/app/login/_components/LoginClient.tsx",
  "src/components/layout/AppHeader.tsx",
  "src/components/layout/MarketplaceFooter.tsx"
]) {
  const value = source(relative);
  assert.ok(!/Yolmod|OTOYALI|Otoyali/.test(value), `${relative} must not render legacy product copy`);
}

console.log("JLC-0518 admin login and visible branding checks: PASS");
