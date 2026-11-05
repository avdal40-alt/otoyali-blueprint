const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const card = readFileSync(join(root, "src", "components", "vehicle", "VehicleCard.tsx"), "utf8");
const detail = readFileSync(join(root, "src", "app", "listing", "[id]", "page.tsx"), "utf8");

assert.match(card, /listing\.seller_type === "dealer" && listing\.seller_display_name\?\.trim\(\)/, "dealer cards must render only a public dealer snapshot");
assert.match(card, /listing\.seller_display_name\.trim\(\)/, "dealer cards must render the public dealer identity");
assert.doesNotMatch(card, /listing\.seller_type === "private"[\s\S]{0,120}seller_display_name/, "private seller identity must not be added to cards");
assert.match(detail, /listing\.seller_display_name \|\| copy\.defaultSeller/, "detail must continue using the listing-safe public snapshot");

console.log("Dealer listing public-identity presentation checks passed");
