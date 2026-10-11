const assert = require("node:assert/strict");
const { execFile, execFileSync, execSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const status = execSync("npx supabase status -o env", { cwd: repositoryRoot, encoding: "utf8" });
const env = Object.fromEntries([...status.matchAll(/^(\w+)="([^"]*)"$/gm)].map(([, key, value]) => [key, value]));
assert.ok(env.API_URL && env.ANON_KEY && env.SERVICE_ROLE_KEY, "local Supabase credentials must be available");

const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anonymous = createClient(env.API_URL, env.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ids = { owner: randomUUID(), other: randomUUID() };
const suffix = String(Date.now()).slice(-8);
const phones = [1, 2, 3, 4, 5].map((digit) => `+905${suffix}${digit}`);
const sql = (statement) => execFileSync(
  "docker",
  ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement],
  { encoding: "utf8" }
).trim();
const sqlAsync = (statement) => new Promise((resolve, reject) => {
  execFile(
    "docker",
    ["exec", "supabase_db_Otoyali-blueprint", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", statement],
    { encoding: "utf8" },
    (error, stdout, stderr) => error ? reject(Object.assign(error, { stdout, stderr })) : resolve(stdout.trim())
  );
});

async function createUser(id, name) {
  const { error } = await service.auth.admin.createUser({
    id,
    email: `jlc-0306-${name}-${id}@example.test`,
    password: `Local-${id}-A9!`,
    email_confirm: true
  });
  assert.ifError(error);
}

(async () => {
  try {
    await createUser(ids.owner, "owner");
    await createUser(ids.other, "other");

    for (const phone of phones.slice(0, 2)) {
      sql(`SELECT identity.upsert_verified_seller_contact_phone('${ids.owner}', '${phone}', 'seller_otp', FALSE);`);
    }
    const concurrentAdds = await Promise.allSettled(phones.slice(2, 4).map((phone) => sqlAsync(
      `SELECT identity.upsert_verified_seller_contact_phone('${ids.owner}', '${phone}', 'seller_otp', FALSE);`
    )));
    assert.equal(concurrentAdds.filter((result) => result.status === "fulfilled").length, 1, "only one concurrent third/fourth contact attempt may succeed");
    const rejectedAdd = concurrentAdds.find((result) => result.status === "rejected");
    assert.match(rejectedAdd?.reason?.stderr ?? "", /active seller contact limit reached/, "the concurrent fourth contact attempt must be rejected by the database");
    assert.equal(
      sql(`SELECT count(*) FROM identity.verified_seller_contact_phones WHERE user_id = '${ids.owner}' AND is_active`),
      "3",
      "an owner may have exactly three active verified contacts"
    );

    const challengesBefore = sql(`SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE user_id = '${ids.owner}'`);
    const reserved = await service.rpc("reserve_seller_phone_verification_challenge_service", {
      p_user_id: ids.owner,
      p_phone_e164: phones[4]
    });
    assert.ifError(reserved.error);
    assert.deepEqual(reserved.data, [{ challenge_id: null, outcome: "active_contact_limit", retry_after_seconds: null }]);
    assert.equal(
      sql(`SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE user_id = '${ids.owner}'`),
      challengesBefore,
      "a rejected fourth contact must not create a challenge or send an OTP"
    );

    assert.equal(
      sql(`DO $$ BEGIN
        PERFORM identity.upsert_verified_seller_contact_phone('${ids.other}', '${phones[0]}', 'seller_otp', FALSE);
        RAISE EXCEPTION 'cross-user seller contact takeover was permitted';
      EXCEPTION WHEN SQLSTATE 'OT409' THEN NULL;
      END $$;`),
      "DO",
      "an active phone cannot be taken over by another seller"
    );

    const anonymousReservation = await anonymous.rpc("reserve_seller_phone_verification_challenge_service", {
      p_user_id: ids.owner,
      p_phone_e164: phones[4]
    });
    assert.ok(anonymousReservation.error, "anonymous callers cannot access the service-only reservation RPC");

    const runtime = fs.readFileSync(path.join(repositoryRoot, "apps", "web", "src", "lib", "seller-phone-verification", "runtime.ts"), "utf8");
    const start = runtime.slice(runtime.indexOf("export async function startSellerPhoneVerification"), runtime.indexOf("export async function verifySellerPhoneVerification"));
    assert.ok(start.indexOf('challenge.outcome === "active_contact_limit"') < start.indexOf("provider.start(phone)"), "the application must reject the limit before invoking the OTP provider");

    console.log("PASS JLC-0306 local active verified seller contact limit");
  } finally {
    const userIds = `'${ids.owner}','${ids.other}'`;
    sql(`DELETE FROM identity.seller_phone_verification_challenges WHERE user_id IN (${userIds});
      DELETE FROM identity.verified_seller_contact_phones WHERE user_id IN (${userIds});`);
    await service.auth.admin.deleteUser(ids.owner);
    await service.auth.admin.deleteUser(ids.other);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
