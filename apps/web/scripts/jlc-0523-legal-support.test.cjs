const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const legal = read("src/i18n/jolmod-legal-documents.ts");
const footer = read("src/components/layout/MarketplaceFooter.tsx");

for (const route of ["terms", "listing-rules", "privacy", "personal-data-consent", "ai-terms", "safety", "contact", "legal"]) {
  assert.ok(fs.existsSync(path.join(root, "src", "app", route, "page.tsx")), `${route} route must exist`);
}
for (const locale of ["ru", "kk", "en", "zhCN"]) assert.ok(legal.includes(`const ${locale}`) || legal.includes(`  ${locale}:`), `${locale} direct legal content must exist`);
for (const key of ["terms", "listingRules", "privacy", "consent", "aiTerms", "safety", "support", "legal"]) assert.ok(legal.includes(`${key}:`), `${key} document must exist`);
assert.ok(legal.includes("return ru[key]"), "Russian must be the legal fallback");
assert.ok(!legal.includes("Jolcar"), "Jolmod legal content must not retain the legacy brand");
assert.ok(!legal.includes("Türkiye") && !legal.includes("Turkey") && !legal.includes("e-Devlet"), "Jolmod legal content must not contain Turkey-first content");
assert.ok(!/(example@example\.com|000000000000|Example LLP|TODO COMPANY)/i.test(legal), "operator data must not be fabricated");
assert.ok(legal.includes("qualified Kazakhstan legal review") && legal.includes("білікті Қазақстан заңгерінің"), "legal review requirement must be explicit");
for (const href of ["/terms", "/listing-rules", "/privacy", "/personal-data-consent", "/ai-terms", "/safety", "/contact", "/legal"]) assert.ok(footer.includes(`href: \"${href}\"`), `${href} must be linked in the footer`);
console.log("JLC-0523 legal/support localization checks passed");
