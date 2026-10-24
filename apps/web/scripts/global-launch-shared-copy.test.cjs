const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

function loadModule(source, fileName) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, require);
  return module.exports;
}

const source = read("src", "i18n", "global-launch-shared-copy.ts");
const { globalLaunchSharedCopy, getGlobalLaunchSharedCopy } = loadModule(source, "global-launch-shared-copy.ts");
const { en } = loadModule(read("src", "i18n", "dictionaries", "en.ts"), "en.ts");
const launchLocales = ["ru", "kk", "en", "zh-CN"];

for (const locale of launchLocales) {
  const candidate = globalLaunchSharedCopy[locale];
  assert.ok(candidate, `${locale} must have direct shared-shell copy`);

  for (const section of ["common", "navigation", "footer"]) {
    assert.deepEqual(
      Object.keys(candidate[section]).sort(),
      Object.keys(en[section]).sort(),
      `${locale}.${section} must match the shared-shell contract exactly`
    );
    for (const [key, value] of Object.entries(candidate[section])) {
      assert.equal(typeof value, "string", `${locale}.${section}.${key} must be a string`);
      assert.ok(value.trim(), `${locale}.${section}.${key} must not be empty`);
      assert.doesNotMatch(value, /\b(?:todo|tbd|lorem ipsum)\b/i, `${locale}.${section}.${key} must not be placeholder copy`);
    }
  }

  assert.equal(candidate.common.appName, "Jolmod", `${locale} must use the Jolmod public brand`);
  assert.match(candidate.footer.description, /Қазақстан|Казахстан|Kazakhstan|哈萨克斯坦/, `${locale} footer must describe the Kazakhstan marketplace`);
  assert.strictEqual(getGlobalLaunchSharedCopy(locale), candidate, `${locale} must resolve directly`);
}

assert.equal(getGlobalLaunchSharedCopy("tr"), undefined, "Turkish must not be a Jolmod launch shared-copy fallback");
assert.equal(getGlobalLaunchSharedCopy("unsupported"), undefined, "Unknown locales must not resolve to Turkish");

const chineseText = Object.values(globalLaunchSharedCopy["zh-CN"].common)
  .concat(Object.values(globalLaunchSharedCopy["zh-CN"].navigation), Object.values(globalLaunchSharedCopy["zh-CN"].footer))
  .join(" ");
assert.doesNotMatch(chineseText, /[\uFFFD□]|\?{2,}|\b(?:todo|tbd)\b/i, "Simplified Chinese source must not contain corruption or placeholders");
assert.match(chineseText, /[\u4E00-\u9FFF]/, "Simplified Chinese source must contain Chinese characters");
assert.doesNotMatch(chineseText, /關|體|臺|車輛市場/, "Launch source must not use Traditional Chinese forms");

console.log("Global launch shared-copy tests passed.");
