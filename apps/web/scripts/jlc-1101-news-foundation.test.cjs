const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");
const dataSource = read("src/data/news.ts");
const newsPage = read("src/app/news/page.tsx");
const articlePage = read("src/app/news/[slug]/page.tsx");
const newsCard = read("src/components/news/NewsCard.tsx");
const newsGrid = read("src/components/news/NewsGrid.tsx");

assert.match(dataSource, /NEWS_CONTENT_SOURCE = "first-party-editorial"/, "news has an explicit first-party source boundary");
assert.match(dataSource, /externalIngestionAllowed: false/, "external ingestion stays disabled");
assert.match(dataSource, /requiresLicenseReview: true/, "a future external source requires licensing review");
const executableData = dataSource.replace(/\/\*[\s\S]*?\*\//g, "");
assert.doesNotMatch(executableData, /https?:\/\/|fetch\(|rss|api[_-]?key|scrap(?:e|ing)/i, "seed content has no external ingestion or third-party asset dependency");

const compiled = ts.transpileModule(dataSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleValue = { exports: {} };
new Function("exports", "module", compiled)(moduleValue.exports, moduleValue);
const { NEWS_CONTENT_SOURCE, NEWS_CONTENT_SOURCE_POLICY, getArticle, newsArticles } = moduleValue.exports;

assert.equal(NEWS_CONTENT_SOURCE, "first-party-editorial");
assert.deepEqual(NEWS_CONTENT_SOURCE_POLICY, {
  source: "first-party-editorial",
  externalIngestionAllowed: false,
  requiresLicenseReview: true
});
assert.ok(newsArticles.length >= 3, "the feed has editorial seed articles");
for (const article of newsArticles) {
  assert.equal(article.source, NEWS_CONTENT_SOURCE, `${article.slug} is first-party editorial content`);
  assert.match(article.slug, /^[a-z0-9-]+$/, `${article.slug} is a stable URL slug`);
  assert.ok(article.title.trim() && article.excerpt.trim() && article.category.trim(), `${article.slug} has card content`);
  assert.ok(Array.isArray(article.body) && article.body.length > 0 && article.body.every((paragraph) => paragraph.trim()), `${article.slug} has article content`);
  assert.ok(!Number.isNaN(Date.parse(article.publishedAt)), `${article.slug} has a valid publication date`);
  assert.equal(getArticle(article.slug), article, `${article.slug} resolves through the domain reader`);
}
assert.equal(getArticle("missing-article"), null, "unknown slugs do not resolve");

assert.match(newsPage, /<NewsGrid articles=\{getNewsArticles\(/, "news index renders the feed through the shared grid");
assert.match(articlePage, /getArticle\(resolvedParams\.slug/, "article pages use the news domain reader");
assert.match(articlePage, /notFound\(\)/, "unknown article pages return 404");
assert.match(articlePage, /article\.attribution/, "article attribution is rendered from the news domain");
assert.match(newsCard, /href=\{`\/news\/\$\{article\.slug\}`\}/, "cards link only to the local article route");
assert.match(newsCard, /SafeImage/, "cards safely handle optional editorial imagery");
assert.match(newsGrid, /articles\.map/, "the grid renders the supplied domain articles");

console.log("JLC-1101 automotive news foundation contract checks passed");
