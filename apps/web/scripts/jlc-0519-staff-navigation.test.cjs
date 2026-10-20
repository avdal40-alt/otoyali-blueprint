const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const helperSource = read("apps/web/src/lib/auth/platform-staff.ts");
const helperModule = { exports: {} };
const transpiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
vm.runInNewContext(transpiled.outputText, {
  module: helperModule,
  exports: helperModule.exports
});
const {
  resolvePlatformStaffState,
  platformStaffNavigationAction,
  shouldRefreshPlatformStaffState
} = helperModule.exports;

const client = ({ user = { id: "staff-user" }, userError = null, admin = true, adminError = null }) => ({
  auth: { getUser: async () => ({ data: { user }, error: userError }) },
  rpc: async (name, args) => {
    assert.equal(name, "is_admin");
    assert.equal(args.uid, user.id);
    return { data: admin, error: adminError };
  }
});

(async () => {
  assert.equal(await resolvePlatformStaffState(client({ admin: true })), "staff");
  assert.equal(await resolvePlatformStaffState(client({ admin: false })), "not_staff");
  assert.equal(await resolvePlatformStaffState(client({ admin: null })), "unknown");
  assert.equal(await resolvePlatformStaffState(client({ admin: null, adminError: new Error("rpc") })), "unknown");
  assert.equal(await resolvePlatformStaffState(client({ userError: new Error("auth") })), "unknown");
  assert.equal(await resolvePlatformStaffState(client({ user: null })), "anonymous");
  assert.equal(platformStaffNavigationAction("staff"), "admin");
  assert.equal(platformStaffNavigationAction("not_staff"), "seller");
  assert.equal(platformStaffNavigationAction("anonymous"), "seller");
  assert.equal(platformStaffNavigationAction("unknown"), null);
  assert.equal(shouldRefreshPlatformStaffState("SIGNED_IN"), true);
  assert.equal(shouldRefreshPlatformStaffState("INITIAL_SESSION"), true);
  assert.equal(shouldRefreshPlatformStaffState("TOKEN_REFRESHED"), true);
  assert.equal(shouldRefreshPlatformStaffState("USER_UPDATED"), true);
  assert.equal(shouldRefreshPlatformStaffState("SIGNED_OUT"), false);

  const staffNavigation = read("apps/web/src/components/layout/PlatformStaffNavigation.tsx");
  assert.ok(staffNavigation.includes("void resolveStaffState(staffClient);"));
  assert.ok(staffNavigation.includes('event === "SIGNED_OUT"'));
  assert.ok(staffNavigation.includes("shouldRefreshPlatformStaffState(event)"));

  for (const file of [
  "apps/web/src/components/layout/AppHeader.tsx",
  "apps/web/src/components/layout/MobileBottomNav.tsx",
  "apps/web/src/components/layout/MarketplaceFooter.tsx"
  ]) {
    const source = read(file);
    assert.ok(source.includes("platformStaffNavigationAction"));
    assert.ok(source.includes('marketplaceAction === "admin" ? "/admin" : "/sell"'));
    assert.ok(source.includes("dictionary.common.adminPanel"));
  }

  const homeAction = read("apps/web/src/components/home/HomeMarketplaceAction.tsx");
  assert.ok(homeAction.includes("platformStaffNavigationAction"));
  assert.ok(homeAction.includes('isStaff ? "/admin" : "/sell"'));
  assert.ok(homeAction.includes("isStaff ? adminLabel : sellerLabel"));

  const sellerGate = read("apps/web/src/app/sell/_components/SellerEntryGate.tsx");
  const staffCheck = sellerGate.indexOf("resolvePlatformStaffState(");
  const adminRedirect = sellerGate.indexOf('router.replace(localizePath("/admin"');
  const sellerPhoneSync = sellerGate.indexOf('sync_own_verified_account_phone');
  assert.ok(staffCheck >= 0 && adminRedirect > staffCheck);
  assert.ok(adminRedirect >= 0 && sellerPhoneSync > adminRedirect);

  console.log("JLC-0519 staff navigation contract passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
