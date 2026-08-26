const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));

assert.equal(packageJson.dependencies.next, "15.5.21");
assert.equal(packageJson.devDependencies["eslint-config-next"], "15.5.21");
assert.equal(packageJson.devDependencies.postcss, "8.5.26");
assert.equal(packageJson.overrides.postcss, "8.5.26");
assert.equal(packageJson.overrides.sharp, "0.35.4");
assert.equal(packageJson.scripts.lint, "next lint");

console.log("SECURITY-FINAL dependency contract passed");
