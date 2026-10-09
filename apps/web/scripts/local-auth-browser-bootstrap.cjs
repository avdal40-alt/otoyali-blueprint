const assert = require("node:assert/strict");
const http = require("node:http");
const { createClient } = require("@supabase/supabase-js");

const apiUrl = process.env.LOCAL_SUPABASE_API_URL;
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.LOCAL_TEST_EMAIL;
const phone = process.env.LOCAL_TEST_PHONE;
const redirectTo = process.env.LOCAL_TEST_REDIRECT_URL || "http://127.0.0.1:3000/";

function requireLocalUrl(value, label) {
  assert.ok(value, `${label} is required`);
  const parsed = new URL(value);
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname), `${label} must be local`);
  return parsed;
}

const localApi = requireLocalUrl(apiUrl, "LOCAL_SUPABASE_API_URL");
requireLocalUrl(redirectTo, "LOCAL_TEST_REDIRECT_URL");
assert.ok(serviceRoleKey, "LOCAL_SUPABASE_SERVICE_ROLE_KEY is required");
assert.match(email || "", /^local-[a-z0-9-]+@example\.test$/i, "LOCAL_TEST_EMAIL must be synthetic");
assert.match(phone || "", /^\+90\d{10}$/, "LOCAL_TEST_PHONE must be a synthetic Turkish number");

const service = createClient(localApi.toString(), serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserId() {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(error);
  return data.users.find((user) => user.email === email)?.id ?? null;
}

async function cleanup() {
  const userId = await findUserId();
  if (userId) {
    const { error } = await service.auth.admin.deleteUser(userId);
    assert.ifError(error);
  }
  console.log("LOCAL_AUTH_BOOTSTRAP_CLEANUP=PASS");
}

async function bootstrap() {
  const existingUserId = await findUserId();
  if (existingUserId) {
    const { error } = await service.auth.admin.deleteUser(existingUserId);
    assert.ifError(error);
  }

  const { error: createError } = await service.auth.admin.createUser({
    email,
    phone,
    email_confirm: true,
    phone_confirm: true
  });
  assert.ifError(createError);

  const { data, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: redirectTo.toString() }
  });
  assert.ifError(linkError);
  assert.ok(data.properties.action_link, "local Auth must issue a magic-link action URL");

  const server = http.createServer((request, response) => {
    if (request.url !== "/") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(302, { Location: data.properties.action_link });
    response.end();
    server.close();
  });
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    console.log(`LOCAL_AUTH_BOOTSTRAP_URL=http://127.0.0.1:${address.port}/`);
  });
}

if (process.argv.includes("--cleanup")) cleanup().catch((error) => { console.error(error.message); process.exitCode = 1; });
else bootstrap().catch((error) => { console.error(error.message); process.exitCode = 1; });
