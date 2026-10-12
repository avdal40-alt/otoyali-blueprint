const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const tokens = read("src/lib/design-system/tokens.ts");
const globals = read("src/app/globals.css");
const market = read("src/lib/market.ts");
const layout = read("src/app/layout.tsx");

assert.match(tokens, /accent:\s*"var\(--brand-accent\)"/);
assert.match(tokens, /accentSoft:\s*"color-mix\(in srgb, var\(--brand-accent\) 10%, transparent\)"/);
assert.match(tokens, /success:\s*"var\(--oto-success\)"/);
assert.match(globals, /--brand-accent:\s*var\(--oto-text\);/);
assert.doesNotMatch(globals, /--brand-accent:\s*initial;/);
assert.match(market, /brandColors:\s*\{\s*accent: string \| null;/);
assert.match(layout, /ACTIVE_MARKET_PROFILE\.brandColors/);
assert.match(layout, /"--brand-accent"/);

const uiRoot = path.join(webRoot, "src", "components", "ui");
const rawPaletteClass = /(?:bg|text|border|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-/;
for (const fileName of fs.readdirSync(uiRoot)) {
  if (!fileName.endsWith(".tsx")) continue;
  const source = fs.readFileSync(path.join(uiRoot, fileName), "utf8");
  assert.doesNotMatch(source, rawPaletteClass, `${fileName} must use design tokens instead of a raw palette utility`);
}

console.log("JLC-0201 design token architecture checks passed");
