const assert = require("assert");
const fs = require("fs");
const path = require("path");

const migration = fs.readFileSync(
  path.join(
    __dirname,
    "../../../supabase/migrations/20261010120000_functional_08_vehicle_owner_reviews.sql",
  ),
  "utf8",
);

for (const fragment of [
  "CREATE TABLE vehicle.owner_reviews",
  "make_id UUID NOT NULL REFERENCES vehicle.makes(id)",
  "model_id UUID NOT NULL REFERENCES vehicle.models(id)",
  "generation_id UUID NOT NULL",
  "modification_id UUID",
  "ownership_status vehicle.review_ownership_status NOT NULL",
  "rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5)",
  "pros TEXT[] NOT NULL DEFAULT '{}'",
  "cons TEXT[] NOT NULL DEFAULT '{}'",
  "owner_reviews_generation_model_fk",
  "owner_reviews_model_make_fk",
  "owner_reviews_modification_generation_fk",
  "ALTER TABLE vehicle.owner_reviews ENABLE ROW LEVEL SECURITY",
  "owner_reviews_select_approved",
  "owner_reviews_select_own",
  "owner_reviews_insert_own",
  "owner_reviews_update_own_pending",
]) {
  assert.ok(migration.includes(fragment), `missing ${fragment}`);
}

assert.ok(
  migration.includes(
    "Owner-authored vehicle experience reviews. This domain intentionally does not rate sellers or dealers.",
  ),
  "vehicle reviews must not introduce a seller or dealer rating domain",
);

assert.ok(
  !migration.includes("seller_rating") && !migration.includes("dealer_rating"),
  "vehicle review domain must not contain seller or dealer rating fields",
);

console.log("JLC-0704 vehicle owner review domain contract passed");
