const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const staffNavigation = read("apps/web/src/components/layout/PlatformStaffNavigation.tsx");
assert.ok(staffNavigation.includes('supabase.rpc("is_admin", {'));
assert.ok(staffNavigation.includes("uid: session.user.id,"));
assert.ok(staffNavigation.includes('if (state === "staff") return "admin";'));
assert.ok(staffNavigation.includes('if (state === "not_staff") return "seller";'));
assert.ok(staffNavigation.includes("return null;"));

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
const staffCheck = sellerGate.indexOf('supabase.rpc("is_admin"');
const adminRedirect = sellerGate.indexOf('router.replace(localizePath("/admin"');
const sellerPhoneSync = sellerGate.indexOf('sync_own_verified_account_phone');
assert.ok(staffCheck >= 0 && adminRedirect > staffCheck);
assert.ok(adminRedirect >= 0 && sellerPhoneSync > adminRedirect);

console.log("JLC-0519 staff navigation contract passed");
