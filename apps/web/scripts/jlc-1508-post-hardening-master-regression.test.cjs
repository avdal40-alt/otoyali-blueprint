const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const commands = [
  [["run", "test:jlc-1302"], "master functional E2E regression"],
  [["run", "test:jlc-1503"], "security, privacy, and RLS regression"],
  [["run", "test:jlc-1407"], "performance budget regression"],
  [["run", "test:jlc-1504"], "reliability and resilience regression"],
  [["run", "test:jlc-1505"], "observability and SLO regression"],
  [["run", "typecheck"], "TypeScript safety"],
  [["run", "build"], "production build"],
  [["audit", "--omit=dev", "--audit-level=high"], "production dependency audit"],
];

for (const [args, purpose] of commands) {
  const result = childProcess.spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: webRoot,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${purpose} must pass the JLC-1508 release gate`);
}

console.log(JSON.stringify({
  gate: "JLC-1508",
  result: "passed",
  enforcedGates: commands.map(([args]) => ["npm", ...args].join(" ")),
  scope: "local-only; no provider, staging, or production action",
}));
