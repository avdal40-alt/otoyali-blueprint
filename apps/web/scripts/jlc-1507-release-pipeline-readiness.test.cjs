const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const document = fs.readFileSync(
  path.resolve(root, "..", "..", "docs", "jolcar-control", "JLC-1507-STAGING-RELEASE-PIPELINE-READINESS.md"),
  "utf8"
);

for (const heading of [
  "Promotion flow and authority boundary",
  "Mandatory evidence gates",
  "Gate simulation and hand-off record",
  "Current local limitation"
]) {
  assert.match(document, new RegExp(heading));
}

for (const command of [
  "test:jlc-1302",
  "test:jlc-1503",
  "test:jlc-1407",
  "test:jlc-1504",
  "test:jlc-1505",
  "typecheck",
  "build"
]) {
  assert.equal(typeof packageJson.scripts[command], "string", `missing package script: ${command}`);
  assert.match(document, new RegExp(`npm run ${command}`));
}

for (const taskId of ["JLC-9001", "JLC-9002", "JLC-9003", "JLC-9004", "JLC-9005"]) {
  assert.match(document, new RegExp(taskId));
}

for (const forbiddenAction of ["supabase db push", "remote migration repair", "provider activation", "DNS change", "production restore"]) {
  assert.match(document, new RegExp(forbiddenAction));
}

assert.doesNotMatch(document, /staging.*(?:created|configured|deployed)|production.*(?:created|configured|deployed)/i);
console.log("JLC-1507 release-pipeline specification and local gate wiring passed");
