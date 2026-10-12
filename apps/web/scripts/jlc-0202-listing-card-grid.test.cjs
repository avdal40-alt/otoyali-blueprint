const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const vehicleCard = read("src/components/vehicle/VehicleCard.tsx");
const vehicleGrid = read("src/components/vehicle/VehicleGrid.tsx");
const safeImage = read("src/components/ui/SafeImage.tsx");

// A fixed media box reserves space before image decoding, preventing card-grid reflow.
assert.match(vehicleCard, /relative aspect-\[4\/3\] bg-oto-surface/);
assert.match(vehicleCard, /<SafeImage src=\{currentImage\}/);
assert.match(safeImage, /"h-full w-full object-cover"/);
assert.match(safeImage, /loading=\{priority \? "eager" : "lazy"\}/);

// Both shared grids start as one compact-safe column and only widen at known breakpoints.
assert.match(vehicleGrid, /"grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-4"/);
assert.match(vehicleGrid, /"grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"/);
assert.match(vehicleGrid, /<VehicleCard key=\{listing\.listing_id\}/);

console.log("JLC-0202 listing-card ratio and stable-grid contract checks passed");
