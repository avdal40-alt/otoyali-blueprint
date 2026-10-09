const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "local-auth-browser-bootstrap.cjs"), "utf8");
assert.match(source, /process\.env\.LOCAL_SUPABASE_API_URL/);
assert.match(source, /process\.env\.LOCAL_SUPABASE_SERVICE_ROLE_KEY/);
assert.match(source, /requireLocalUrl\(apiUrl, "LOCAL_SUPABASE_API_URL"\)/);
assert.match(source, /auth\.admin\.generateLink/);
assert.match(source, /type: "magiclink"/);
assert.match(source, /Location: data\.properties\.action_link/);
assert.match(source, /server\.listen\(0, "127\.0\.0\.1"/);
assert.match(source, /process\.argv\.includes\("--reuse"\)/);
assert.match(source, /--reuse requires an existing synthetic local user/);
assert.match(source, /--cleanup/);
assert.doesNotMatch(source, /54321|55421|access_token|refresh_token|password/);

console.log("local-auth-browser-bootstrap: PASS");
