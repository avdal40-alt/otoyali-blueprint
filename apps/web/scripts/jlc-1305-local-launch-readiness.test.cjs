const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const queue = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "docs", "jolcar-control", "TASK_QUEUE.json"), "utf8")
);
const report = fs.readFileSync(
  path.join(repoRoot, "docs", "jolcar-control", "JLC-1305-LOCAL-LAUNCH-READINESS.md"),
  "utf8"
);

const taskById = new Map(queue.tasks.map((task) => [task.id, task]));
const readinessTask = taskById.get("JLC-1305");

assert.ok(readinessTask, "JLC-1305 must remain in the authoritative queue");
assert.equal(readinessTask.status, "completed", "JLC-1305 must be completed only with the local package");

for (const dependency of readinessTask.dependencies) {
  assert.equal(taskById.get(dependency)?.status, "completed", `${dependency} must be completed`);
}

for (const heading of [
  "Dependency release-gate evidence",
  "Migrations and local database position",
  "Explicit unresolved decisions and authority boundaries",
  "Queue audit"
]) {
  assert.match(report, new RegExp(heading));
}

for (const value of [
  "3117db4",
  "0c6075d",
  "488f065",
  "208887f",
  "29ca252",
  "ab457b0",
  "4873f00",
  "b079fac",
  "20261014123000",
  "JLC-9001 through JLC-9005"
]) {
  assert.match(report, new RegExp(value));
}

for (const unresolved of ["JLC-D003", "JLC-D004", "JLC-D005", "JLC-D006", "JLC-D007", "JLC-D011", "O-014", "O-015"]) {
  assert.match(report, new RegExp(unresolved));
}

assert.match(report, /No external provider,\nreal SMS\/OTP, staging or production target, deployment, DNS change, remote\nmigration, Git push, or paid-provider call was used/);
console.log("JLC-1305 local launch-readiness package audit passed");
