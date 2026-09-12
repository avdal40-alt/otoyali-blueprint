const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function load(source, filename, requireImpl = require) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, requireImpl);
  return module.exports;
}

const config = load(fs.readFileSync(path.join(root, "src", "i18n", "config.ts"), "utf8"), "config.ts");
const context = load(fs.readFileSync(path.join(root, "src", "features", "ai", "domain", "context.ts"), "utf8"), "context.ts", (request) => {
  if (request === "@/i18n/config") return config;
  if (request === "@/lib/marketplace/verticals") {
    return {
      DEFAULT_MARKETPLACE_VERTICAL: "cars",
      getVerticalByTurkishPath: () => undefined,
      resolveMarketplaceVertical: (vertical) => vertical
    };
  }
  throw new Error(`Unexpected assistant context dependency: ${request}`);
});

assert.equal(context.shouldShowAssistantForPath("/"), false, "Home must not render the Rif launcher");
assert.equal(context.shouldShowAssistantForPath("/en"), false, "English Home must normalize to Home and not render the Rif launcher");
assert.equal(context.shouldShowAssistantForPath("/search"), true, "Previously eligible non-Home routes must remain eligible");
assert.equal(context.shouldShowAssistantForPath("/en/profile"), false, "Existing ineligible routes must remain ineligible after locale normalization");

console.log("Assistant context eligibility tests passed.");
