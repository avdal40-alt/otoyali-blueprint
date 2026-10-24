const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const copyFile = path.join(root, "src", "app", "favorites", "_components", "favorites-copy.ts");
const clientFile = path.join(root, "src", "app", "favorites", "_components", "FavoritesClient.tsx");
const source = fs.readFileSync(copyFile, "utf8");
assert.equal(source.includes("�"), false, "favorites copy must be valid UTF-8");
for (const locale of ["ru", "kk", "en", "zhCN"]) assert.match(source, new RegExp(`const ${locale}: FavoritesCopy = \\{`), `${locale} copy must be direct`);
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
new Function("exports", "module", "require", output)(loaded.exports, loaded, (request) => {
  if (request === "@/i18n/config") return { normalizeLocale: (locale) => locale?.toLowerCase().startsWith("en") ? "en" : "tr" };
  throw new Error(`Unexpected dependency: ${request}`);
});
const { getFavoritesCopy } = loaded.exports;
const tr = getFavoritesCopy("tr");
for (const locale of ["ru", "kk", "en", "zh-CN"]) {
  const copy = getFavoritesCopy(locale);
  assert.notEqual(copy, tr, `${locale} must not use Turkish fallback`);
  for (const key of ["title", "eyebrow", "favorite", "configurationUnavailable", "loadFailed", "actionFailed", "emptyTitle", "emptyBody", "searchListings"]) assert.equal(typeof copy[key], "string");
  assert.doesNotMatch(JSON.stringify(copy), /TODO|\?\?\?/i);
}
assert.match(JSON.stringify(getFavoritesCopy("zh-CN")), /[\u4e00-\u9fff]/);
assert.doesNotMatch(JSON.stringify(getFavoritesCopy("zh-CN")), /[�□]|\?\?\?|TODO/i);
assert.equal(getFavoritesCopy("de"), getFavoritesCopy("ru"), "unsupported Jolmod favorites locales must fall back to Russian");
const client = fs.readFileSync(clientFile, "utf8");
assert.match(client, /getFavoritesCopy\(locale\)/);
assert.doesNotMatch(client, /dictionary\.(favorites|errors)/);
assert.match(client, /localizePath\("\/login", locale\)/, "login return path must retain locale");
const button = fs.readFileSync(path.join(root, "src", "components", "vehicle", "FavoriteButton.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "src", "app", "favorites", "page.tsx"), "utf8");
assert.match(button, /getFavoritesCopy\(locale\)/);
assert.doesNotMatch(button, /dictionary\.(favorites|errors|navigation)/);
assert.match(page, /getFavoritesCopy\(locale\)/);
console.log("Favorites four-language localization tests passed.");
