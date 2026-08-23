const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const sourcePath = path.join(projectRoot, "src", "lib", "auth", "return-path.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  },
  fileName: sourcePath
}).outputText;
const returnPathModule = { exports: {} };

new Function("require", "module", "exports", compiled)(require, returnPathModule, returnPathModule.exports);

const { safeNextPath } = returnPathModule.exports;
const fallback = "/profile";

const allowed = [
  "/",
  "/sell",
  "/sell?edit=valid",
  "/tr",
  "/en/search?q=test",
  "/my-listings#active",
  "/tr/listing/abc#section"
];

for (const candidate of allowed) {
  assert.equal(safeNextPath(candidate, fallback), candidate, `${candidate} should remain an internal return path`);
  assert.equal(new URL(safeNextPath(candidate, fallback), "https://app.example").origin, "https://app.example");
}

const rejected = [
  "https://evil.example",
  "http://evil.example",
  "//evil.example",
  "///evil.example",
  "/\\evil.com",
  "/\\evil.example",
  "\\\\evil.example",
  "javascript:alert(1)",
  "data:text/html,<h1>evil</h1>",
  "",
  "   ",
  " /sell",
  "/sell ",
  "/\tevil.example",
  "/%5Cevil.example",
  "/%2Fevil.example",
  "/%255Cevil.example",
  "/%252Fevil.example"
];

for (const candidate of rejected) {
  assert.equal(safeNextPath(candidate, fallback), fallback, `${JSON.stringify(candidate)} should use the fallback`);
}

const decodedBySearchParams = [
  new URLSearchParams("next=%2F%5Cevil.com").get("next"),
  new URLSearchParams("next=%2F%2Fevil.example").get("next"),
  new URLSearchParams("next=%2F%255Cevil.example").get("next"),
  new URLSearchParams("next=%2F%252Fevil.example").get("next")
];

for (const candidate of decodedBySearchParams) {
  assert.equal(safeNextPath(candidate, fallback), fallback, `decoded ${JSON.stringify(candidate)} should use the fallback`);
}

assert.equal(safeNextPath(null, "/en/profile"), "/en/profile");
assert.equal(safeNextPath(undefined, "/tr/profile"), "/tr/profile");
assert.equal(safeNextPath(123, fallback), fallback);
assert.equal(safeNextPath("/sell?next=https%3A%2F%2Fevil.example#safe", fallback), "/sell?next=https%3A%2F%2Fevil.example#safe");
assert.equal(safeNextPath("/a/../sell?edit=valid#photos", fallback), "/sell?edit=valid#photos");
assert.equal(safeNextPath("//evil.example", "https://bad.example"), "/");

const authUiSource = fs.readFileSync(path.join(srcRoot, "lib", "auth", "auth-ui.ts"), "utf8");
const legacyAuthSource = fs.readFileSync(path.join(srcRoot, "lib", "auth.ts"), "utf8");
const loginSource = fs.readFileSync(path.join(srcRoot, "app", "login", "_components", "LoginClient.tsx"), "utf8");
const otpSource = fs.readFileSync(path.join(srcRoot, "app", "otp", "_components", "OtpClient.tsx"), "utf8");
const callbackSource = fs.readFileSync(path.join(srcRoot, "app", "auth", "callback", "_components", "AuthCallbackClient.tsx"), "utf8");

assert.ok(authUiSource.includes('export { safeNextPath } from "./return-path"'));
assert.ok(!authUiSource.includes("decodeURIComponent(value)"));
assert.ok(legacyAuthSource.includes('import { safeNextPath } from "./auth/return-path"'));
assert.ok(legacyAuthSource.includes('safeNextPath(searchParams.get("next"), "/")'));
assert.ok(loginSource.includes('safeNextPath(searchParams.get("next"), localizePath("/profile", locale))'));
assert.ok(otpSource.includes('router.replace(safeNextPath(searchParams.get("next"), localizePath("/profile", locale)))'));
assert.ok(callbackSource.includes('const next = safeNextPath(searchParams.get("next"), "/profile")'));

console.log("auth return-path tests passed");
