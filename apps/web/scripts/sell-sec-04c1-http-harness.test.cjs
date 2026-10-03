const assert = require("node:assert/strict");
const { createLocalAuthenticatedHttpFixture } = require("./helpers/local-auth-http-fixture.cjs");
const { fetchWithTimeout, isListening, startOwnedNextServer, stopOwnedNextServer } = require("./helpers/next-http-test-server.cjs");

(async () => {
  const fixture = await createLocalAuthenticatedHttpFixture();
  let server;
  try {
    server = await startOwnedNextServer({
      NEXT_PUBLIC_SUPABASE_URL: fixture.localSupabase.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fixture.localSupabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: "",
    });
    const request = { method: "POST", headers: { "content-type": "application/json" }, body: "{}" };
    const unauthenticated = await fetchWithTimeout(`${server.origin}/api/listings`, request);
    const authenticated = await fetchWithTimeout(`${server.origin}/api/listings`, {
      ...request,
      headers: { ...request.headers, Authorization: `Bearer ${fixture.accessToken}` },
    });
    assert.equal(unauthenticated.status, 401, "listing route must reject missing Authorization header");
    assert.equal(authenticated.status, 422, "authenticated request must reach deterministic request validation before draft creation");
    assert.notEqual(authenticated.status, unauthenticated.status, "authenticated and unauthenticated route outcomes must differ");
    console.log("PASS SELL-SEC-04C1-R0B local authenticated Next HTTP harness");
  } finally {
    try {
      if (server) {
        await stopOwnedNextServer(server);
        assert.equal(await isListening(server.port), false, "owned test port must be released");
      }
    } finally {
      fixture.cleanup();
    }
  }
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
