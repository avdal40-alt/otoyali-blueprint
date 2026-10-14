const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf8"));
const requiredGates = [
  ["test:jlc-1301", "master authorization, RLS, privacy, and secret-boundary regression"],
  ["test:jlc-0507", "sanitized upload and media-ownership regression"],
  ["test:jlc-0703", "anti-fraud and private moderation-signal regression"],
];

for (const [gate, purpose] of requiredGates) {
  const result = childProcess.spawnSync(process.execPath, [process.env.npm_execpath, "run", gate], {
    cwd: webRoot,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${gate} must pass the JLC-1503 ${purpose}`);
}

assert.equal(packageJson.dependencies.next, "15.5.28", "Next.js must stay on the patched release");
assert.equal(packageJson.dependencies.sharp, "0.35.5", "Sharp must stay on the patched release");
assert.equal(packageJson.overrides["source-map-js"], "1.2.2", "source-map-js must stay on the patched release");

const clientRoots = [path.join(webRoot, "src", "app"), path.join(webRoot, "src", "components")];
const clientFiles = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filePath);
    else if (/\.(ts|tsx)$/.test(entry.name)) clientFiles.push(filePath);
  }
}
for (const root of clientRoots) visit(root);

for (const filePath of clientFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  if (!/^\s*["']use client["'];/m.test(source)) continue;
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE(?:_KEY)?|service_role/i, `client module must not contain a service credential reference: ${path.relative(webRoot, filePath)}`);
}

console.log(JSON.stringify({
  gate: "JLC-1503",
  result: "passed",
  enforcedGates: requiredGates.map(([gate]) => gate),
  dependencyPins: { next: "15.5.28", sharp: "0.35.5", sourceMapJs: "1.2.2" },
  clientServiceCredentialReferences: "absent",
}));
