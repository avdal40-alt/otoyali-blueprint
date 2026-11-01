const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(path.join(__dirname, "..", "..", "..", "supabase", "migrations", "20261102120000_vehicle_marketplace_v2_foundation.sql"), "utf8");

for (const token of [
  "CREATE TYPE marketplace.vehicle_category",
  "'passenger_car', 'truck', 'bus', 'trailer', 'special_machinery'",
  "CREATE TYPE marketplace.listing_purpose AS ENUM ('sale', 'rent')",
  "rental_price_per_day",
  "rental_price_per_month",
  "minimum_rental_days",
  "security_deposit_amount",
  "with_driver_or_operator",
  "CREATE TABLE marketplace.listing_vehicle_category_details",
  "ENABLE ROW LEVEL SECURITY",
  "REVOKE ALL ON TABLE marketplace.listing_vehicle_category_details FROM PUBLIC, anon, authenticated"
]) assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

assert.match(migration, /listing_purpose = 'sale'[\s\S]*price_amount IS NOT NULL/);
assert.match(migration, /listing_purpose = 'rent'[\s\S]*price_amount IS NULL[\s\S]*currency = 'KZT'[\s\S]*rental_price_per_day IS NOT NULL/);
assert.doesNotMatch(migration, /\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b|\bUPDATE marketplace\.listings\b/i);
console.log("Vehicle Marketplace V2 foundation migration contract passed");
