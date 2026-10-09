const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..", "..");
const modulePath = path.join(root, "apps", "web", "src", "lib", "listings", "edit-payload.ts");
const source = fs.readFileSync(modulePath, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = new Module(modulePath);
loaded.filename = modulePath;
loaded.paths = Module._nodeModulePaths(path.dirname(modulePath));
loaded._compile(compiled, modulePath);
const { normalizeEditEngineVolume } = loaded.exports;

assert.strictEqual(normalizeEditEngineVolume("gasoline", "1.6"), 1.6);
assert.strictEqual(normalizeEditEngineVolume("diesel", "2"), 2);
assert.strictEqual(normalizeEditEngineVolume("gasoline", "0"), 0);
assert.strictEqual(normalizeEditEngineVolume("gasoline", "not-a-number"), null);
assert.strictEqual(normalizeEditEngineVolume("gasoline", ""), null);
assert.strictEqual(normalizeEditEngineVolume("electric", "1.6"), null);
assert.doesNotMatch(source, /NaN|Infinity/);

const wizard = fs.readFileSync(path.join(root, "apps", "web", "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
const server = fs.readFileSync(path.join(root, "apps", "web", "src", "lib", "listings", "server-write.ts"), "utf8");
assert.match(wizard, /normalizeEditEngineVolume\(state\.fuelType, submittedSnapshot\.engineVolumeL\)/);
assert.match(wizard, /engineVolumeL: state\.fuelType === "electric" \? null : Number\(state\.engineVolumeL\)/);
assert.match(server, /engineVolumeL: z\.number\(\)\.positive\(\)\.max\(999\.9\)\.nullable\(\)/);
assert.match(server, /fuelType !== "electric" && value\.engineVolumeL === null/);
assert.match(server, /rpc\("save_own_listing_edit"/);

console.log("listing-edit-payload: PASS");
