const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const firstLoadBudgetKb = 300;
const criticalRoutes = ["/", "/search", "/listing/[id]", "/dealer/[id]", "/sell", "/profile/dealer-crm"];

function localSupabaseEnv() {
  const output = childProcess.execSync("npx supabase status -o env", {
    cwd: path.resolve(webRoot, "..", ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
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
    NEXT_PUBLIC_SUPABASE_ANON_KEY: entries.get("ANON_KEY")
  };
}

function buildOutput() {
  return childProcess.execFileSync(
    process.execPath,
    [path.join(webRoot, "node_modules", "next", "dist", "bin", "next"), "build"],
    {
      cwd: webRoot,
      env: { ...process.env, ...localSupabaseEnv() },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      // Webpack can emit extensive recoverable cache warnings; preserve the build
      // output for route-budget parsing instead of failing at spawnSync's 1 MiB default.
      maxBuffer: 16 * 1024 * 1024
    }
  );
}

function firstLoadKb(output, route) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = output.match(new RegExp(`(?:├|└|┌) [ƒ○] ${escapedRoute}\\s+[^\\r\\n]*?\\s+(\\d+(?:\\.\\d+)?) kB`, "m"));
  assert.ok(match, `Build output must include a First Load JS result for ${route}`);
  return Number(match[1]);
}

function assertHydrationAndCacheBoundaries() {
  const assistantRoot = fs.readFileSync(path.join(webRoot, "src", "features", "ai", "components", "AssistantRoot.tsx"), "utf8");
  assert.match(assistantRoot, /dynamic\(\(\) => import\("\.\/AssistantPanel"/, "Assistant panel must remain code-split");
  assert.match(assistantRoot, /ssr:\s*false/, "Assistant panel must not hydrate on the server");
  assert.match(assistantRoot, /\{open \? <AssistantPanel/, "Closed assistant panels must not mount or hydrate");

  for (const relativePath of ["src/app/page.tsx", "src/app/search/page.tsx", "src/app/listing/[id]/page.tsx"]) {
    const source = fs.readFileSync(path.join(webRoot, relativePath), "utf8");
    assert.match(source, /export const dynamic = "force-dynamic"/, `${relativePath} must remain request-dynamic while it reads locale/request-scoped data`);
    assert.match(source, /export const revalidate = 0/, `${relativePath} must not serve stale listing/search data from a shared cache`);
  }
}

function main() {
  assertHydrationAndCacheBoundaries();
  const output = buildOutput();
  const bundles = Object.fromEntries(criticalRoutes.map((route) => [route, firstLoadKb(output, route)]));
  for (const [route, kb] of Object.entries(bundles)) {
    assert.ok(kb <= firstLoadBudgetKb, `${route} First Load JS ${kb} kB exceeds ${firstLoadBudgetKb} kB`);
  }
  console.log(JSON.stringify({ firstLoadBudgetKb, bundles, hydration: "assistant panel mounts only after user opens it", cache: "request-dynamic public routes retain no shared stale-data cache" }));
}

main();
