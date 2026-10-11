const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const wizard = read("apps/web/src/app/sell/_components/SellWizard.tsx");
const writeBoundary = read("apps/web/src/lib/listings/server-write.ts");
const migration = read("supabase/migrations/20261011190000_jlc0407_zero_km_condition_invariant.sql");

assert.match(wizard, /condition === "new" \? "0"/);
assert.match(wizard, /disabled=\{state\.condition === "new"\}/);
assert.match(wizard, /condition === "used" && \(!state\.mileageKm \|\| Number\(state\.mileageKm\) <= 0\)/);
assert.match(wizard, /condition === "new" && state\.mileageKm !== "0"/);
assert.match(writeBoundary, /const validConditionMileage/);
assert.match(writeBoundary, /New listings must have zero mileage/);
assert.match(writeBoundary, /Used listings require mileage greater than zero/);
assert.equal((writeBoundary.match(/validConditionMileage\(value, context\)/g) ?? []).length, 2, "create and edit validate condition mileage");
assert.match(migration, /vehicle_profiles_condition_mileage_chk/);
assert.match(migration, /condition = 'new' AND mileage_km = 0/);
assert.match(migration, /condition = 'used' AND mileage_km > 0/);

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim();
const definition = query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'vehicle.vehicle_profiles'::regclass AND conname = 'vehicle_profiles_condition_mileage_chk'");
assert.match(definition, /condition = 'new'/);
assert.match(definition, /mileage_km = 0/);
assert.match(definition, /condition = 'used'/);
assert.match(definition, /mileage_km > 0/);

console.log("JLC-0407 zero-km versus used listing flow passed");
