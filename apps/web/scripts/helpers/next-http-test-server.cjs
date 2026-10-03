const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { readFileSync, rmSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;
const BUILD_TIMEOUT_MS = 180_000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
}

function waitForExit(child) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
}

function allocateLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
  });
}

function killOwnedProcessTree(pid) {
  if (process.platform !== "win32") {
    try { process.kill(pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    return Promise.resolve();
  }
  return withTimeout(new Promise((resolve, reject) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", shell: false });
    killer.once("error", reject);
    killer.once("exit", resolve);
  }), SHUTDOWN_TIMEOUT_MS, "owned Next process-tree shutdown");
}

async function runOwnedProcess(command, args, options, label) {
  let child;
  try {
    await withTimeout(new Promise((resolve, reject) => {
      child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"], shell: false });
      let output = "";
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
      child.once("error", reject);
      child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${label} exited ${code}: ${output}`)));
    }), BUILD_TIMEOUT_MS, label);
  } catch (error) {
    if (child?.exitCode === null) await killOwnedProcessTree(child.pid);
    throw error;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal, redirect: "manual" }); }
  finally { clearTimeout(timer); }
}

async function stopOwnedNextServer(server) {
  const { child, port } = server;
  try {
    if (child.exitCode === null) {
      child.kill();
      try { await withTimeout(waitForExit(child), SHUTDOWN_TIMEOUT_MS, "owned Next server shutdown"); }
      catch { await killOwnedProcessTree(child.pid); await withTimeout(waitForExit(child), SHUTDOWN_TIMEOUT_MS, "owned Next process-tree final shutdown"); }
    }
    assert.equal(await isListening(port), false, `owned test port ${port} is still listening after cleanup`);
  } finally {
    server.cleanupBuild();
  }
}

async function startOwnedNextServer(environment) {
  assert.match(environment.NEXT_PUBLIC_SUPABASE_URL, /^http:\/\/(?:127\.0\.0\.1|localhost):54321$/, "Next test server must use local Supabase");
  assert.notEqual(environment.NEXT_PUBLIC_SUPABASE_URL.includes("uivazzvxelptjmbbfvir"), true, "Next test server must not target production Supabase");
  const projectRoot = path.resolve(__dirname, "..", "..");
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const distDir = ".next-sell-sec-04c1-http-harness";
  const artifact = path.join(projectRoot, distDir);
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  const nextEnvPath = path.join(projectRoot, "next-env.d.ts");
  const tsconfigBefore = readFileSync(tsconfigPath);
  const nextEnvBefore = readFileSync(nextEnvPath);
  const buildEnvironment = { ...environment, YOLMOD_I18N_TEST_DIST_DIR: distDir };
  const cleanupBuild = () => {
    rmSync(artifact, { recursive: true, force: true });
    writeFileSync(tsconfigPath, tsconfigBefore);
    writeFileSync(nextEnvPath, nextEnvBefore);
  };
  const port = await allocateLoopbackPort();
  let child;
  let output = "";
  try {
    rmSync(artifact, { recursive: true, force: true });
    await runOwnedProcess(process.execPath, [nextBin, "build"], { cwd: projectRoot, env: { ...process.env, ...buildEnvironment } }, "isolated local Next build");
    child = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: projectRoot,
      env: { ...process.env, ...buildEnvironment },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    const server = { child, port, origin: `http://127.0.0.1:${port}`, cleanupBuild };
    await withTimeout((async () => {
      while (true) {
        if (child.exitCode !== null) throw new Error(`owned Next server exited during startup (${child.exitCode}): ${output}`);
        try {
          const response = await fetchWithTimeout(`${server.origin}/robots.txt`);
          if (response.ok) return;
        } catch { /* poll until bounded readiness expires */ }
        await delay(200);
      }
    })(), STARTUP_TIMEOUT_MS, "owned Next server readiness");
    return server;
  } catch (error) {
    if (child) await stopOwnedNextServer({ child, port, cleanupBuild }); else cleanupBuild();
    throw error;
  }
}

module.exports = { fetchWithTimeout, isListening, startOwnedNextServer, stopOwnedNextServer };
