const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const globals = read("src/app/globals.css");
const pageContainer = read("src/components/layout/PageContainer.tsx");
const header = read("src/components/layout/AppHeader.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");
const drawer = read("src/components/search/MobileFilterDrawer.tsx");
const vehicleCard = read("src/components/vehicle/VehicleCard.tsx");

assert.match(globals, /\*\s*\{\s*box-sizing:\s*border-box;/);
assert.match(globals, /body\s*\{[\s\S]*?overflow-x:\s*hidden;/);
assert.match(globals, /button,[\s\S]*?max-width:\s*100%;/);
assert.match(pageContainer, /min-w-0 w-full max-w-\[1180px\] pb-24/);

assert.match(header, /h-7 w-auto sm:h-8/);
assert.match(header, /<LanguageSwitcher \/>/);
assert.match(header, /min-h-11 min-w-11/);
assert.match(read("src\/components\/layout\/LanguageSwitcher.tsx"), /hidden rounded-full[\s\S]*?sm:inline-flex/);
assert.match(bottomNav, /safe-bottom fixed inset-x-0 bottom-0/);
assert.match(bottomNav, /min-h-16/);

assert.match(drawer, /fixed inset-0 z-50 lg:hidden/);
assert.match(drawer, /min-h-11 min-w-11/);
assert.match(vehicleCard, /aspect-\[4\/3\]/);
assert.match(vehicleCard, /flex h-11 w-11[\s\S]*?md:hidden md:group-hover:flex/);

console.log("JLC-0203 responsive shell contract checks passed");
