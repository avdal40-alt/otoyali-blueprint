const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
function load(source, fileName) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", output)(module.exports, module, require);
  return module.exports;
}

const source = read("src", "i18n", "global-launch-home-copy.ts");
const { globalLaunchHomeCopy, getGlobalLaunchHomeCopy } = load(source, "global-launch-home-copy.ts");
const { en } = load(read("src", "i18n", "dictionaries", "en.ts"), "en.ts");

for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const copy = globalLaunchHomeCopy[locale];
  assert.ok(copy, `${locale} requires direct Home copy`);
  assert.deepEqual(Object.keys(copy.home).sort(), Object.keys(en.home).sort(), `${locale} Home keys must match the canonical contract`);
  assert.strictEqual(getGlobalLaunchHomeCopy(locale), copy, `${locale} must resolve directly`);
  for (const value of flatten(copy.home)) {
    assert.ok(value.trim(), `${locale} Home copy must not be empty`);
    assert.doesNotMatch(value, /\b(?:todo|tbd|lorem ipsum)\b/i, `${locale} Home copy must not be placeholder text`);
  }
  assert.match(copy.home.title, /Қазақстан|Казахстан|Kazakhstan|哈萨克斯坦/, `${locale} Home title must retain the Kazakhstan marketplace`);
}

assert.equal(getGlobalLaunchHomeCopy("tr"), undefined, "Turkish must not be a Jolmod Home fallback");
const chinese = flatten(globalLaunchHomeCopy["zh-CN"].home).join(" ");
assert.match(chinese, /[\u4E00-\u9FFF]/, "Chinese Home copy must contain Simplified Chinese characters");
assert.doesNotMatch(chinese, /[\uFFFD□]|\?{2,}|關|體|臺|\b(?:todo|tbd)\b/i, "Chinese Home copy must not contain corruption, Traditional Chinese, or placeholders");

function flatten(section) {
  return Object.values(section).flatMap((value) => typeof value === "string" ? [value] : flatten(value));
}

console.log("Global launch Home-copy tests passed.");
