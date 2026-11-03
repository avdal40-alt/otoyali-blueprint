const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const foundation = read("supabase", "migrations", "20261102120000_vehicle_marketplace_v2_foundation.sql");
const drafts = read("supabase", "migrations", "20261102121000_vehicle_marketplace_v2_protected_drafts.sql");
const projection = read("supabase", "migrations", "20261102122000_vehicle_marketplace_v2_public_projection.sql");
const editAdmin = read("supabase", "migrations", "20261102123000_vehicle_marketplace_v2_edit_admin.sql");
const adminProjection = read("supabase", "migrations", "20261102124000_vehicle_marketplace_v2_admin_projection.sql");
const publicDetailsBoundary = read("supabase", "migrations", "20261102125000_vehicle_marketplace_v2_public_details_boundary.sql");
const contract = read("apps", "web", "src", "lib", "marketplace", "v2-contract.ts");
const serverWrite = read("apps", "web", "src", "lib", "listings", "server-write.ts");
const route = read("apps", "web", "src", "app", "api", "listings", "v2", "route.ts");
const wizard = read("apps", "web", "src", "app", "sell", "_components", "SellWizard.tsx");
const searchFilters = read("apps", "web", "src", "components", "search", "SearchFilters.tsx");
const savedSearchContract = read("apps", "web", "src", "lib", "saved-search", "contract.ts");
const listingDetails = read("apps", "web", "src", "app", "listing", "[id]", "page.tsx");
const dealerPage = read("apps", "web", "src", "app", "dealer", "[id]", "page.tsx");
const adminClient = read("apps", "web", "src", "app", "admin", "_components", "AdminClient.tsx");

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
assert.match(route, /saveOwnVehicleMarketplaceV2Listing/);
assert.match(serverWrite, /editVehicleMarketplaceV2ListingSchema/);
assert.match(serverWrite, /save_own_listing_v2_edit/);

// Editing stays owner-only and category/purpose are immutable after creation.
// The database, not the UI, repeats the rental and trailer constraints.
assert.match(editAdmin, /SECURITY DEFINER\s+SET search_path = public, marketplace, vehicle, identity, pg_catalog/s);
assert.match(editAdmin, /public\.is_admin\(v_user\)/);
assert.match(editAdmin, /identity\.require_kazakhstan_seller_contact_phone/);
assert.match(editAdmin, /v_listing\.status NOT IN \('draft','rejected'\)/);
assert.match(editAdmin, /v_listing\.updated_at IS DISTINCT FROM p_expected_listing_updated_at/);
assert.match(editAdmin, /v_listing\.vehicle_category='trailer'[\s\S]*trailer cannot include engine or mileage fields/s);
assert.match(editAdmin, /v_listing\.listing_purpose='sale'[\s\S]*invalid sale price contract/s);
assert.match(editAdmin, /invalid rental price contract/);
assert.match(editAdmin, /REVOKE ALL ON FUNCTION public\.save_own_listing_v2_edit[\s\S]*FROM PUBLIC, anon, authenticated, service_role/s);
assert.match(editAdmin, /GRANT EXECUTE ON FUNCTION public\.save_own_listing_v2_edit[\s\S]*TO authenticated/s);
assert.doesNotMatch(editAdmin, /\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b/i);

// The seller UI uses the protected V2 application route for every non-legacy
// category/purpose combination; trailers deliberately omit engine/mileage.
assert.match(wizard, /usesV2Contract \? "\/api\/listings\/v2" : "\/api\/listings"/);
assert.match(wizard, /vehicleCategories\.map/);
assert.match(wizard, /listingPurposes\.map/);
assert.match(wizard, /isTrailer \? null : state\.mileageKm/);
assert.match(wizard, /rentalPricePerDay/);
assert.match(wizard, /CommercialCapacityFields/);

// The same filters are serialised into the query request and may be saved;
// saved-search matching stays on the canonical database matcher.
for (const token of ["vehicleCategory", "listingPurpose", "rentalPriceDayMin", "minimumRentalDays", "withDriverOrOperator"]) {
  assert.match(searchFilters, new RegExp(token));
}
for (const token of ["vehicle_categories", "listing_purposes", "rental_price_day_min", "minimum_rental_days", "with_driver_or_operator"]) {
  assert.match(savedSearchContract, new RegExp(`"${token}"`));
}

// Public discovery reuses the KZ-scoped search projection and accepts rental
// daily-price semantics without exposing seller contact or private data.
assert.match(projection, /marketplace\.is_jolmod_kazakhstan_city/);
assert.match(projection, /vehicle_category,listing_purpose,rental_price_per_day/);
assert.match(projection, /COALESCE\(p_document\.price_amount,p_document\.rental_price_per_day\)/);
assert.match(projection, /vehicle_marketplace_v2_request_matches/);
assert.match(projection, /details\.truck_body_type/);
assert.match(publicDetailsBoundary, /public_listing_category_details/);
assert.match(publicDetailsBoundary, /c\.country_code='KZ'/);
assert.match(publicDetailsBoundary, /GRANT EXECUTE ON FUNCTION marketplace\.public_listing_category_details\(UUID\) TO anon, authenticated/);
assert.doesNotMatch(publicDetailsBoundary, /GRANT\s+(?:SELECT|ALL)\s+ON TABLE marketplace\.listing_vehicle_category_details\s+TO\s+(?:anon|authenticated)/i);

// All public and staff presentation layers consume the same category/purpose
// price contract rather than treating rental daily prices as sale prices.
for (const surface of [listingDetails, dealerPage, adminClient]) {
  assert.match(surface, /formatListingPurposePrice/);
  assert.match(surface, /vehicleCategoryLabel/);
}
assert.match(listingDetails, /listing\.vehicle_category === "trailer"/);
assert.match(listingDetails, /truckBodyType/);
assert.match(listingDetails, /operatingHours/);
assert.match(adminProjection, /DROP FUNCTION public\.admin_list_listing_moderation/);
assert.match(adminProjection, /public\.is_admin\(v_user_id\)/);
assert.match(adminProjection, /REVOKE ALL ON FUNCTION public\.admin_list_listing_moderation[\s\S]*FROM PUBLIC, anon, authenticated, service_role/s);
assert.doesNotMatch(projection, /GRANT\s+ALL\s+ON\s+TABLE\s+marketplace\.listing_search_documents\s+TO\s+(?:anon|authenticated)/i);

console.log("vehicle-marketplace-v2: PASS");
