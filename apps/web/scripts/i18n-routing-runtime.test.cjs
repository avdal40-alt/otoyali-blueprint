const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const normalDistDir = ".next-i18n-normal";
const maintenanceDistDir = ".next-i18n-maintenance";
const BUILD_TIMEOUT_MS = 180_000;
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function withTimeout(promise, timeoutMs, phase) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${phase} timed out after ${timeoutMs}ms`)), timeoutMs); })]).finally(() => clearTimeout(timer));
}
function waitForExit(child) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
}
function run(command, args, environment, phase) {
  let child;
  const processResult = new Promise((resolve, reject) => {
    child = spawn(command, args, { cwd: projectRoot, env: { ...process.env, ...environment }, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${phase} exited ${code}`)));
  });
  return withTimeout(processResult, BUILD_TIMEOUT_MS, phase).catch(async (error) => {
    if (child?.exitCode === null) {
      await killProcessTree(child.pid);
      await withTimeout(waitForExit(child), SHUTDOWN_TIMEOUT_MS, `${phase} final child-process exit`);
    }
    throw error;
  });
}
function killProcessTree(pid) {
  if (process.platform !== "win32") {
    try { process.kill(pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    return Promise.resolve();
  }
  return withTimeout(new Promise((resolve, reject) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", shell: false });
    killer.once("error", reject); killer.once("exit", resolve);
  }), SHUTDOWN_TIMEOUT_MS, "forced server process-tree shutdown");
}
function allocatePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}
async function request(origin, pathname, options = {}) {
  const controller = new AbortController();
  const method = options.method || "GET";
  const label = `request ${method} ${pathname}`;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${pathname}`, { redirect: "manual", ...options, signal: controller.signal });
    const body = await response.text();
    return { response, body };
  }
  catch (error) { if (timedOut) throw new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`); throw error; }
  finally { clearTimeout(timer); }
}
function parseJsonBody(body, label) {
  try { return JSON.parse(body); }
  catch (error) { throw new Error(`${label} returned invalid JSON: ${error.message}`); }
}
async function startServer(port, environment) {
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { cwd: projectRoot, env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"], shell: false });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; }); child.stderr.on("data", (chunk) => { output += chunk; });
  const origin = `http://127.0.0.1:${port}`;
  try {
    await withTimeout((async () => {
      while (true) {
        if (child.exitCode !== null) throw new Error(`Next.js server exited during startup (${child.exitCode}):\n${output}`);
        try { await request(origin, "/robots.txt"); return; } catch { await delay(200); }
      }
    })(), STARTUP_TIMEOUT_MS, "server readiness");
    return { child, origin };
  } catch (error) { await stopServer(child); throw new Error(`${error.message}\n${output}`); }
}
async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill();
  try { await withTimeout(waitForExit(child), SHUTDOWN_TIMEOUT_MS, "server shutdown"); }
  catch (error) { await killProcessTree(child.pid); await withTimeout(waitForExit(child), SHUTDOWN_TIMEOUT_MS, "final server process exit"); if (child.exitCode === null) throw error; }
}
function assertNoRedirect(response, label) {
  assert.ok(response.status < 300 || response.status > 399, `${label} must not redirect`);
  assert.equal(response.headers.get("location"), null, `${label} must not set Location`);
}
function snapshotArtifact(directory) {
  if (!existsSync(directory)) return "absent";
  const hash = createHash("sha256");
  const walk = (current, relative) => {
    const stat = lstatSync(current); hash.update(`${relative}:${stat.size}:${stat.mtimeMs}:${stat.isDirectory()};`);
    if (stat.isDirectory()) for (const entry of readdirSync(current).sort()) walk(path.join(current, entry), path.join(relative, entry));
    else if (relative === "BUILD_ID") hash.update(readFileSync(current));
  };
  walk(directory, ""); return hash.digest("hex");
}
async function withBuiltServer(mode, distDir, verify) {
  const environment = { NEXT_PUBLIC_YOLMOD_CUTOVER_MODE: mode, YOLMOD_I18N_TEST_DIST_DIR: distDir };
  const artifact = path.join(projectRoot, distDir); rmSync(artifact, { recursive: true, force: true });
  let child;
  try {
    await run(process.execPath, [nextBin, "build"], environment, `${mode} isolated build`);
    const port = await withTimeout(allocatePort(), REQUEST_TIMEOUT_MS, "port allocation");
    const server = await startServer(port, environment); child = server.child;
    await verify(server.origin);
  } finally { if (child) await stopServer(child); rmSync(artifact, { recursive: true, force: true }); }
}
async function verifyApiSlash(origin, expectedStatus, label) {
  let { response } = await request(origin, "/api/", { headers: { "accept-language": "en" } });
  assert.equal(response.status, 308, `${label} /api/ remains Next.js's one-hop canonical redirect`);
  assert.equal(response.headers.get("location"), "/api");
  ({ response } = await request(origin, response.headers.get("location"), { headers: { "accept-language": "en" } }));
  assert.equal(response.status, expectedStatus); assertNoRedirect(response, `${label} /api final`);
}
async function verifyNormal(origin) {
  let { response } = await request(origin, "/about", { headers: { "accept-language": "en" } });
  assert.equal(response.status, 307); assert.equal(response.headers.get("location"), "/en/about");
  let result = await request(origin, "/en/about"); response = result.response; assert.equal(response.status, 200); assert.match(result.body, /AI-first transportation platform/i);
  ({ response } = await request(origin, "/tr/about")); assert.equal(response.status, 307); assert.equal(response.headers.get("location"), "/about");
  ({ response } = await request(origin, response.headers.get("location"))); assert.equal(response.status, 200); assertNoRedirect(response, "/tr/about final request");
  ({ response } = await request(origin, "/api", { headers: { "accept-language": "en" } })); assert.equal(response.status, 404); assertNoRedirect(response, "/api");
  await verifyApiSlash(origin, 404, "normal");
  ({ response } = await request(origin, "/api/ai/assistant", { method: "POST", headers: { "accept-language": "en", "content-type": "application/json" }, body: "{}" })); assert.equal(response.status, 400); assertNoRedirect(response, "/api/ai/assistant");
  ({ response } = await request(origin, "/auth/callback?code=test&state=test", { headers: { "accept-language": "en" } })); assert.equal(response.status, 200); assertNoRedirect(response, "/auth/callback");
  ({ response } = await request(origin, "/robots.txt")); assert.equal(response.status, 200); assertNoRedirect(response, "/robots.txt");
}
async function verifyMaintenance(origin) {
  for (const [pathname, method, headers] of [["/about", "GET", {}], ["/about", "GET", { "accept-language": "en" }], ["/about", "POST", {}], ["/auth/callback?code=test", "GET", {}], ["/maintenance", "POST", {}], ["/maintenance", "OPTIONS", {}]]) {
    const { response, body } = await request(origin, pathname, { method, headers });
    assert.equal(response.status, 503, `${method} ${pathname} must be terminal 503 during maintenance`); assertNoRedirect(response, `${method} ${pathname}`);
    assert.equal(response.headers.get("retry-after"), "60"); assert.equal(response.headers.get("cache-control"), "no-store");
    if (method !== "OPTIONS") assert.match(body, /Kısa bir bakımdayız/);
  }
  let { response } = await request(origin, "/api", { headers: { "accept-language": "en" } });
  assert.equal(response.status, 503); assertNoRedirect(response, "/api maintenance"); assert.equal(response.headers.get("content-type"), "application/json");
  await verifyApiSlash(origin, 503, "maintenance");
  const result = await request(origin, "/api/ai/assistant", { method: "POST", body: "{}" }); response = result.response; assert.equal(response.status, 503); assertNoRedirect(response, "/api/ai/assistant maintenance"); assert.deepEqual(parseJsonBody(result.body, "/api/ai/assistant maintenance"), { error: "Service temporarily unavailable" });
}
(async () => {
  const normalArtifact = path.join(projectRoot, ".next"); const before = snapshotArtifact(normalArtifact);
  // Next updates tsconfig's generated-types paths for non-default distDirs.
  // Preserve the developer's exact configuration after this test completes.
  const tsconfigPath = path.join(projectRoot, "tsconfig.json"); const tsconfigBefore = readFileSync(tsconfigPath);
  const nextEnvPath = path.join(projectRoot, "next-env.d.ts"); const nextEnvBefore = readFileSync(nextEnvPath);
  try {
    await withBuiltServer("normal", normalDistDir, verifyNormal);
    await withBuiltServer("maintenance", maintenanceDistDir, verifyMaintenance);
    assert.equal(snapshotArtifact(normalArtifact), before, "runtime test must leave the normal .next artifact untouched");
    console.log("I18N runtime routing tests passed.");
  } finally {
    rmSync(path.join(projectRoot, normalDistDir), { recursive: true, force: true });
    rmSync(path.join(projectRoot, maintenanceDistDir), { recursive: true, force: true });
    writeFileSync(tsconfigPath, tsconfigBefore);
    writeFileSync(nextEnvPath, nextEnvBefore);
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
