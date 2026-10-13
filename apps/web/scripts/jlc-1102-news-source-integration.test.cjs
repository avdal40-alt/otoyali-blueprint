const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const webRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(webRoot, "src/data/news.ts"), "utf8");

assert.match(source, /export type NewsContentProvider/, "news exposes a provider contract");
assert.match(source, /firstPartyEditorialNewsProvider/, "first-party provider is explicit");
assert.match(source, /ownership: "jolcar-owned"/, "provider declares Jolcar ownership");
assert.match(source, /licensing: "first-party-original"/, "provider declares first-party licensing");
assert.match(source, /supportedLocales: \["kk-KZ", "ru-KZ", "en"\]/, "provider records approved launch locales");
assert.match(source, /countryCodes: \["KZ"\]/, "provider records its country scope");
assert.match(source, /externalIngestionAllowed: false/, "external ingestion remains disabled");
assert.match(source, /getNewsArticles/, "UI-facing reads delegate through the provider boundary");

const executable = source.replace(/\/\*[\s\S]*?\*\//g, "");
assert.doesNotMatch(executable, /https?:\/\/|fetch\(|rss|api[_-]?key|scrap(?:e|ing)/i, "provider has no network, secret, or scraping dependency");

const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleValue = { exports: {} };
new Function("exports", "module", compiled)(moduleValue.exports, moduleValue);
const { FIRST_PARTY_EDITORIAL_SOURCE, getArticle, getNewsArticles } = moduleValue.exports;

assert.equal(FIRST_PARTY_EDITORIAL_SOURCE.attribution, "Jolcar Editorial");
assert.equal(FIRST_PARTY_EDITORIAL_SOURCE.copyrightNotice, "© Jolcar. Original editorial content.");
assert.deepEqual(FIRST_PARTY_EDITORIAL_SOURCE.countryCodes, ["KZ"]);
assert.deepEqual(FIRST_PARTY_EDITORIAL_SOURCE.supportedLocales, ["kk-KZ", "ru-KZ", "en"]);
const articles = getNewsArticles({ countryCode: "KZ", locale: "ru-KZ", limit: 2 });
assert.equal(articles.length, 2, "provider uses a bounded read");
assert.ok(articles.every((article) => article.source === "first-party-editorial" && article.provenance === "jolcar-owned" && article.attribution === "Jolcar Editorial"));
assert.equal(getNewsArticles({ countryCode: "TR" }).length, 0, "country scope is enforced");
assert.equal(getArticle(articles[0].slug, { countryCode: "KZ", locale: "en" }).slug, articles[0].slug, "article reads preserve locale-ready context");
assert.equal(getArticle(articles[0].slug, { countryCode: "TR" }), null, "out-of-scope country cannot read an article");

console.log("JLC-1102 approved first-party news source integration contract checks passed");
