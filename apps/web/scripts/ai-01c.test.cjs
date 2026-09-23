const assert = require("node:assert/strict");
const fs = require("node:fs"); const path = require("node:path"); const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const expert = read("src", "features", "ai", "listing", "listing-expert.ts"); const service = read("src", "features", "ai", "services", "assistant-service.ts");
assert.match(expert, /getListingDetails/); assert.match(expert, /compareListingIdsSchema/); assert.match(expert, /\.min\(2\)\.max\(4\)/); assert.match(expert, /comparisonMatrix/); assert.match(expert, /lowest price/); assert.match(expert, /lowest mileage/); assert.match(expert, /overall winner/); assert.match(expert, /missingFields/);
assert.doesNotMatch(expert, /seller_contact|service_role|cover_image_url|seller_id|vin|plate|moderation/i); assert.match(service, /executeListingExpert/);
console.log("AI-01C listing expert and public comparison contract passed");
