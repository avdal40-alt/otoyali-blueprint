const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013124500_jlc0913_public_dealer_live_viewer.sql"), "utf8");
const dealerPage = fs.readFileSync(path.join(__dirname, "..", "src", "app", "dealer", "[id]", "page.tsx"), "utf8");
const viewerPage = fs.readFileSync(path.join(__dirname, "..", "src", "app", "live", "[id]", "page.tsx"), "utf8");

for (const expected of [
  "CREATE OR REPLACE FUNCTION public.get_public_dealer_live_stream", "CREATE OR REPLACE FUNCTION public.list_public_dealer_live_streams",
  "stream.status = 'live'", "public.is_verified_dealer(stream.dealer_id)", "COALESCE(media.card_url, media.large_url, media.url)",
  "marketplace.is_listing_search_eligible(listing.id)", "GRANT EXECUTE ON FUNCTION public.get_public_dealer_live_stream(UUID), public.list_public_dealer_live_streams(UUID, INTEGER)",
  "TO anon, authenticated"
]) assert.ok(migration.includes(expected), `missing ${expected}`);
assert.doesNotMatch(migration, /provider_stream_ref|stop_reason|stopped_by|auth\.users|phone|contact/i);
for (const expected of ["get_public_dealer_live_stream", "Live playback will appear here through the configured streaming provider.", "Vehicles featured in this live", "localizePath(`/listing/${listing.listing_id}`, locale)", "aspect-video", "sm:grid-cols-2", "min-h-11"]) assert.ok(viewerPage.includes(expected), `viewer missing ${expected}`);
for (const expected of ["list_public_dealer_live_streams", "localizePath(`/live/${stream.stream_id}`, locale)", "No live streams right now"]) assert.ok(dealerPage.includes(expected), `dealer page missing ${expected}`);
assert.doesNotMatch(viewerPage, /providerStreamRef|provider_stream_ref|phone|contact|auth\.users/i);
console.log("PASS JLC-0913 public dealer live viewer contract");
