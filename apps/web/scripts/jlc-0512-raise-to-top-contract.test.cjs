const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const migration = fs.readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20261010250000_listing_raise_to_top.sql"), "utf8");
const ui = fs.readFileSync("src/app/profile/listings/_components/MyListingsClient.tsx", "utf8");
assert.match(migration, /raised_at TIMESTAMPTZ/); assert.match(migration, /public\.raise_own_listing/); assert.match(migration, /interval '7 days'/); assert.match(migration, /SECURITY DEFINER SET search_path/); assert.match(migration, /REVOKE ALL ON FUNCTION public\.raise_own_listing/); assert.match(migration, /COALESCE\(d\.raised_at,d\.published_at/); assert.match(migration, /'published_at',published_at/); assert.match(ui, /raise_own_listing/); assert.doesNotMatch(migration + ui, /checkout|escrow|subscription|wallet/i);
console.log("JLC-0512 raise-to-top contract: PASS");
