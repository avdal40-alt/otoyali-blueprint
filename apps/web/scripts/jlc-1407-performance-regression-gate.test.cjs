const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const requiredGates = [
  ["test:jlc-1401", "jlc-1401-performance-baseline.test.cjs"],
  ["test:jlc-1402", "jlc-1402-query-index-audit.test.cjs"],
  ["test:jlc-1403", "jlc-1403-media-delivery.test.cjs"],
  ["test:jlc-1404", "jlc-1404-frontend-performance.test.cjs"],
  ["test:jlc-1405", "jlc-1405-background-work-boundary.test.cjs"],
  ["test:jlc-1406", "jlc-1406-search-scaling-boundary.test.cjs"],
  ["test:jlc-1204", "jlc-1204-performance-sanity.test.cjs"],
];

for (const [gate, script] of requiredGates) {
  const result = childProcess.spawnSync(process.execPath, [path.join(webRoot, "scripts", script)], {
    cwd: webRoot,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${gate} must pass the JLC-1407 performance release gate`);
}

console.log(JSON.stringify({
  gate: "JLC-1407",
  result: "passed",
  enforcedGates: requiredGates.map(([gate]) => gate),
  budgets: [
    "local critical-flow warm responses",
    "critical-route First Load JS",
    "bounded query/index plan",
    "responsive media delivery",
    "background-work boundary",
    "Search v1 scaling boundary",
  ],
}));
