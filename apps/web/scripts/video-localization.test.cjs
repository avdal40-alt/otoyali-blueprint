const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const source = read("src", "app", "video", "video-copy.ts");
const page = read("src", "app", "video", "page.tsx");
const teaser = read("src", "components", "home", "VideoTeaserSection.tsx");
const loaded = { exports: {} };
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
new Function("exports", "module", output)(loaded.exports, loaded);

const { getVideoCopy } = loaded.exports;
const ru = getVideoCopy("ru");
const kk = getVideoCopy("kk");
const en = getVideoCopy("en");
const zhCN = getVideoCopy("zh-CN");

for (const [locale, copy] of Object.entries({ ru, kk, en, "zh-CN": zhCN })) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(ru).sort(), `${locale} must expose the complete public-video contract`);
  if (locale !== "ru") assert.notEqual(copy, ru, `${locale} must resolve direct launch copy`);
  assert.doesNotMatch(JSON.stringify(copy), /TODO|TBD|\?\?\?|\uFFFD|□/i, `${locale} must not contain placeholder or corrupted copy`);
}

assert.equal(getVideoCopy("de"), ru, "Unsupported Jolmod locales must fall back to Russian");
assert.notEqual(getVideoCopy("tr"), ru, "Historical Turkish copy must not be selected as Jolmod fallback");
assert.match(JSON.stringify(zhCN), /[\u4E00-\u9FFF]/, "zh-CN must contain Simplified Chinese text");
assert.doesNotMatch(JSON.stringify(zhCN), /關|體|臺/, "zh-CN must not use Traditional Chinese placeholders");

assert.match(page, /getVideoCopy/);
assert.doesNotMatch(page, /dictionary\.video/);
assert.match(teaser, /getVideoCopy/);
assert.doesNotMatch(teaser, /dictionary\.video/);

console.log("Public video and homepage teaser four-language localization tests passed.");
