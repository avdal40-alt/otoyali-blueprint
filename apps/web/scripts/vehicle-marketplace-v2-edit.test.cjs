const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const wizard = read("apps", "web", "src", "app", "sell", "_components", "SellWizard.tsx");
const loader = read("supabase", "migrations", "20261103120000_vehicle_marketplace_v2_edit_hydration.sql");
const route = read("apps", "web", "src", "app", "api", "listings", "v2", "route.ts");
const writes = read("apps", "web", "src", "lib", "listings", "server-write.ts");

// The owner-only loader provides every V2 fact to the shared editor. These
// fields cover passenger rent, truck sale/rent, bus rent, trailer sale/rent,
// and machinery rent without a browser-side table query.
for (const field of [
  "vehicle_category", "listing_purpose", "rental_price_per_day", "rental_price_per_month",
  "minimum_rental_days", "security_deposit_amount", "with_driver_or_operator",
  "truck_body_type", "bus_type", "trailer_type", "machinery_type", "payload_capacity_kg",
  "gross_weight_kg", "axle_count", "seat_count", "operating_hours"
]) assert.match(loader, new RegExp(`'${field}'`));
for (const category of ["passenger_car", "truck", "bus", "trailer", "special_machinery"]) assert.match(wizard, new RegExp(`"${category}"`));
for (const purpose of ["sale", "rent"]) assert.match(wizard, new RegExp(`"${purpose}"`));

assert.match(wizard, /setVehicleCategory\(loadedCategory\)/);
assert.match(wizard, /setListingPurpose\(loadedPurpose\)/);
assert.match(wizard, /setV2Fields\(\{/);
assert.match(wizard, /const usesV2Contract = isV2Edit/);
assert.match(wizard, /usesV2Contract \? `\/api\/listings\/v2\?listingId=\$\{editListingId\}`/);
assert.match(wizard, /validateVehicleMarketplaceV2ForPublish\(state, vehicleCategory, listingPurpose, v2Fields/);

// Trailers deliberately never hydrate or send engine/mileage data.
assert.match(wizard, /const isTrailer = vehicleCategory === "trailer"/);
assert.match(wizard, /mileageKm: isTrailer \? null/);
assert.match(wizard, /fuelType: isTrailer \? null/);
assert.match(wizard, /transmission: isTrailer \? null/);
assert.match(wizard, /engineVolumeL: isTrailer \|\|/);

// Category/purpose are shown as immutable facts. Saves and resubmission stay
// on protected API/RPC boundaries; browser code has no direct status mutation.
assert.match(wizard, /isV2Edit \? <>/);
assert.match(writes, /save_own_listing_v2_edit/);
assert.match(route, /saveOwnVehicleMarketplaceV2Listing/);
assert.match(wizard, /\/api\/listings\/\$\{editListingId\}\/resubmit/);
assert.match(writes, /resubmit_own_listing_for_review/);
assert.doesNotMatch(wizard, /\.from\("marketplace\.listings"\)\.update/);

console.log("vehicle-marketplace-v2-edit: PASS");
