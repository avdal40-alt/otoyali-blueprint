const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const migration = read("supabase", "migrations", "20261103130000_vehicle_marketplace_v2_dealer_import.sql");
const parser = read("apps", "web", "src", "lib", "marketplace", "excel-import-server.ts");
const feedRoute = read("apps", "web", "src", "app", "api", "dealer", "feed", "route.ts");

// Static contract coverage is intentional: the local Docker runtime is not
// available in this task. The runtime matrix exercises this same RPC later.
for (const field of [
  "vehicle_category", "listing_purpose", "rental_price_per_day", "rental_price_per_month", "minimum_rental_days", "security_deposit_amount", "with_driver_or_operator",
  "truck_body_type", "bus_type", "trailer_type", "machinery_type", "payload_capacity_kg", "gross_weight_kg", "axle_count", "seat_count", "operating_hours"
]) {
  assert.match(parser, new RegExp(`"${field}"`), `Excel accepts ${field}`);
  assert.match(migration, new RegExp(field), `RPC validates/persists ${field}`);
}
assert.match(parser, /maxColumns: 32/);
assert.match(parser, /requiredPassengerCarHeaders/);
assert.match(parser, /isLegacyOrPassengerCar/);
assert.match(parser, /isLegacyOrSale/);
assert.match(migration, /ELSE 'passenger_car'::marketplace\.vehicle_category/);
assert.match(migration, /ELSE 'sale'::marketplace\.listing_purpose/);

// All ten approved category/purpose combinations use the same external-ID
// reconciliation branch and distinct sale/rental price assignments.
for (const category of ["passenger_car", "truck", "bus", "trailer", "special_machinery"]) {
  assert.match(migration, new RegExp(`v_category='${category}'|v_category<>'${category}'`), category);
}
for (const purpose of ["sale", "rent"]) assert.match(migration, new RegExp(`v_purpose='${purpose}'`), purpose);
assert.match(migration, /v_purpose='sale'[\s\S]*invalid_sale_price_contract/);
assert.match(migration, /v_purpose='rent'[\s\S]*invalid_rental_price_contract/);

for (const error of [
  "invalid_vehicle_category", "invalid_listing_purpose", "invalid_rental_price_contract", "invalid_sale_price_contract",
  "truck_details_not_valid_for_category", "bus_details_not_valid_for_category", "trailer_engine_mileage_fields_not_allowed"
]) assert.match(migration, new RegExp(error), error);

// Authorization, ownership, KZ/KZT binding, and the dealer-scoped identity
// are preserved. The API still delegates to this one canonical importer.
for (const invariant of [
  "public.is_verified_galeri", "staff accounts cannot perform seller actions", "dealer_id=v_dealer_id", "seller_id=v_dealer_id",
  "country_code='KZ'", "currency='KZT'", "source='excel'", "ON CONFLICT (listing_id) DO UPDATE"
]) assert.match(migration, new RegExp(invariant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), invariant);
assert.match(feedRoute, /apply_dealer_feed_api_import/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.apply_own_verified_galeri_excel_import\(TEXT,JSONB\) FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.apply_own_verified_galeri_excel_import\(TEXT,JSONB\) TO authenticated/);
assert.doesNotMatch(migration, /\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b/i);

console.log("vehicle-marketplace-v2-dealer-import: static contract PASS");
