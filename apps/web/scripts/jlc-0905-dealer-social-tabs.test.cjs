const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "src", "app", "dealer", "[id]", "page.tsx"), "utf8");
for (const expected of [
  'const tabs = ["posts", "cars", "videos", "live"] as const',
  'get_public_dealer_posts',
  'p_dealer_id: id, p_limit: 20',
  'video_count',
  'const videoListings = stock.filter((listing) => (listing.video_count ?? 0) > 0)',
  'No posts yet', 'No vehicles available', 'No videos available', 'No live streams right now',
  'overflow-x-auto', 'min-h-11', 'aria-current={tab === item ? "page" : undefined}',
  'localizePath(`/listing/${listing.listing_id}`, locale)'
]) assert.ok(page.includes(expected), `missing ${expected}`);
assert.doesNotMatch(page, /seller_contact|phone|auth\.users/i);
console.log("JLC-0905 dealer social tabs UI contract passed");
