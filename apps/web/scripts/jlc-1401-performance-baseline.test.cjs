const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const localPort = 3101;
const publicWarmBudgetMs = 3_000;
const authenticatedEntryWarmBudgetMs = 1_000;

function localSupabaseEnv() {
  const output = childProcess.execSync("npx supabase status -o env", {
    cwd: path.resolve(webRoot, "..", ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const entries = new Map(output.split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf("=");
    const value = line.slice(separator + 1).replace(/^"(.*)"$/, "$1");
    return separator > 0 ? [[line.slice(0, separator), value]] : [];
  }));
  assert.ok(entries.get("API_URL"), "Local Supabase API_URL must be available");
  assert.ok(entries.get("ANON_KEY"), "Local Supabase ANON_KEY must be available");
  return {
    NEXT_PUBLIC_SUPABASE_URL: entries.get("API_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: entries.get("ANON_KEY"),
  };
}

function runLocalSql(sql) {
  return childProcess.execFileSync(
    "docker",
    ["exec", "supabase_db_Otoyali-blueprint", "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(localPort, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(baseUrl, child) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Local Next.js server exited early with ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Local Next.js server did not become ready within 30 seconds");
}

async function measure(baseUrl, route) {
  const startedAt = process.hrtime.bigint();
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return { route, status: response.status, elapsedMs: Math.round(elapsedMs) };
}

async function main() {
  const port = await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const supabaseEnv = localSupabaseEnv();
  const listingId = runLocalSql("SELECT id FROM marketplace.listings WHERE status = 'active' ORDER BY published_at DESC NULLS LAST LIMIT 1;");
  const dealerId = runLocalSql("SELECT id FROM public.profiles WHERE seller_type = 'dealer' ORDER BY created_at DESC LIMIT 1;");
  const fixtureLimitations = [];
  if (!listingId) fixtureLimitations.push("listing detail used a not-found route because this local database has no active listing fixture");
  if (!dealerId) fixtureLimitations.push("dealer profile used a not-found route because this local database has no dealer fixture");

  childProcess.execFileSync(
    process.execPath,
    [path.join(webRoot, "node_modules", "next", "dist", "bin", "next"), "build"],
    { cwd: webRoot, env: { ...process.env, ...supabaseEnv }, stdio: "inherit", windowsHide: true },
  );

  const child = childProcess.spawn(
    process.execPath,
    [path.join(webRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    {
      cwd: webRoot,
      env: { ...process.env, ...supabaseEnv },
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    },
  );
  let serverErrors = "";
  child.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });

  try {
    await waitForServer(baseUrl, child);
    const routes = ["/", "/search", `/listing/${listingId || "not-a-local-listing"}`, "/sell", `/dealer/${dealerId || "not-a-local-dealer"}`, "/profile/dealer-crm"];
    const cold = [];
    const warm = [];
    for (const route of routes) cold.push(await measure(baseUrl, route));
    for (const route of routes) warm.push(await measure(baseUrl, route));

    for (const result of [...cold, ...warm]) {
      const isExpectedFixtureNotFound = result.status === 404 && result.route.includes("not-a-local-");
      assert.ok(isExpectedFixtureNotFound || (result.status >= 200 && result.status < 400), `${result.route} must respond successfully, received ${result.status}\n${serverErrors.slice(-2_000)}`);
    }
    for (const result of warm.filter(({ route }) => !["/sell", "/profile/dealer-crm"].includes(route))) {
      assert.ok(result.elapsedMs <= publicWarmBudgetMs, `${result.route} warm response ${result.elapsedMs}ms exceeds ${publicWarmBudgetMs}ms local budget`);
    }
    for (const result of warm.filter(({ route }) => ["/sell", "/profile/dealer-crm"].includes(route))) {
      assert.ok(result.elapsedMs <= authenticatedEntryWarmBudgetMs, `${result.route} entry response ${result.elapsedMs}ms exceeds ${authenticatedEntryWarmBudgetMs}ms local budget`);
    }

    console.log(JSON.stringify({ cold, warm, budgets: { publicWarmBudgetMs, authenticatedEntryWarmBudgetMs }, fixtureLimitations }));
  } finally {
    if (child.exitCode === null) child.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
