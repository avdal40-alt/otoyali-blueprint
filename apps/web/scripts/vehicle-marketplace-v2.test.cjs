const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const foundation = read("supabase", "migrations", "20261102120000_vehicle_marketplace_v2_foundation.sql");
const drafts = read("supabase", "migrations", "20261102121000_vehicle_marketplace_v2_protected_drafts.sql");
const contract = read("apps", "web", "src", "lib", "marketplace", "v2-contract.ts");
const serverWrite = read("apps", "web", "src", "lib", "listings", "server-write.ts");
const route = read("apps", "web", "src", "app", "api", "listings", "v2", "route.ts");

// The ten approved category/purpose combinations share one listing identity;
// rental is a distinct KZT daily-price contract, never a sale-price overload.
for (const category of ["passenger_car", "truck", "bus", "trailer", "special_machinery"]) {
  assert.match(contract, new RegExp(`"${category}"`));
  for (const purpose of ["sale", "rent"]) assert.match(contract, new RegExp(`"${purpose}"`));
}
assert.match(foundation, /listing_purpose = 'sale'[\s\S]*price_amount IS NOT NULL/);
assert.match(foundation, /listing_purpose = 'rent'[\s\S]*price_amount IS NULL[\s\S]*currency = 'KZT'[\s\S]*rental_price_per_day IS NOT NULL/);
assert.match(drafts, /p_listing_purpose='sale'[\s\S]*p_sale_price_amount_text IS NULL[\s\S]*invalid sale price contract/s);
assert.match(drafts, /ELSE\s+IF p_sale_price_amount_text IS NOT NULL[\s\S]*p_rental_price_per_day_text IS NULL[\s\S]*invalid rental price contract/s);

// Category-specific data is bounded by the protected definer RPC. Trailers
// cannot be forced through passenger engine/mileage data.
assert.match(drafts, /p_vehicle_category='trailer'[\s\S]*trailer cannot include engine or mileage fields/s);
assert.match(drafts, /p_vehicle_category <> 'truck'[\s\S]*truck details are not valid/s);
assert.match(drafts, /p_vehicle_category <> 'bus'[\s\S]*bus details are not valid/s);
assert.match(drafts, /p_vehicle_category <> 'trailer'[\s\S]*trailer details are not valid/s);
assert.match(drafts, /p_vehicle_category <> 'special_machinery'[\s\S]*machinery details are not valid/s);

// Protected seller-write invariants remain server/database enforced.
assert.match(drafts, /SECURITY DEFINER SET search_path = public, marketplace, vehicle, identity, pg_catalog/);
assert.match(drafts, /identity\.require_kazakhstan_seller_contact_phone/);
assert.match(drafts, /staff accounts cannot perform seller actions/);
assert.match(drafts, /REVOKE ALL ON FUNCTION public\.create_own_listing_draft_v3[\s\S]*FROM PUBLIC, anon, service_role, authenticated/s);
assert.match(drafts, /GRANT EXECUTE ON FUNCTION public\.create_own_listing_draft_v3[\s\S]*TO authenticated/s);
assert.doesNotMatch(drafts, /\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b|\bUPDATE marketplace\.listings\b/i);

// The API explicitly opts into the V3 boundary; the legacy passenger route is
// not silently repointed at an unapplied schema contract.
assert.match(serverWrite, /createVehicleMarketplaceV2ListingSchema/);
assert.match(serverWrite, /create_own_listing_draft_v3/);
assert.match(route, /createVehicleMarketplaceV2ListingSchema/);
assert.match(route, /createOwnVehicleMarketplaceV2Draft/);

console.log("vehicle-marketplace-v2: PASS");
