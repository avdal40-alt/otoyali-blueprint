const assert = require("node:assert/strict");
const { createVerifiedGaleriFixture } = require("./helpers/verified-galeri-fixture.cjs");

(async () => {
  const fixture = await createVerifiedGaleriFixture();
  try {
    const normal = await fixture.normal.rpc("is_verified_galeri", { p_dealer_id: fixture.ids.normal });
    assert.ifError(normal.error);
    assert.equal(normal.data, false, "ordinary authenticated user must not be a verified Galeri");

    const verified = await fixture.verified.rpc("is_verified_galeri", { p_dealer_id: fixture.ids.dealer });
    assert.ifError(verified.error);
    assert.equal(verified.data, true, "canonical submit/review transition must produce the public verified signal");
    console.log("PASS SELL-SEC-04C1-R0A verified Galeri fixture canonical transition and cleanup contract");
  } finally {
    fixture.cleanup();
  }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
