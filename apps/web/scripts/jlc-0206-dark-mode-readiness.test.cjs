const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const tokens = read("src/lib/design-system/tokens.ts");
const globals = read("src/app/globals.css");

for (const token of [
  "bg",
  "surface",
  "surfaceRaised",
  "surfaceMuted",
  "text",
  "textSoft",
  "muted",
  "border",
  "borderStrong",
  "skeleton",
  "hover",
  "disabled",
  "focus"
]) {
  assert.match(tokens, new RegExp(`${token}:\\s*"var\\(--oto-`));
}

const darkTheme = globals.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
assert.ok(darkTheme, "an alternate dark theme token scope must exist");
for (const variable of [
  "--oto-bg",
  "--oto-surface",
  "--oto-surface-raised",
  "--oto-surface-muted",
  "--oto-text",
  "--oto-text-soft",
  "--oto-muted",
  "--oto-border",
  "--oto-border-strong",
  "--oto-skeleton",
  "--oto-hover",
  "--oto-disabled",
  "--oto-focus-color"
]) {
  assert.match(darkTheme[1], new RegExp(`${variable}:`), `${variable} must be overridable by the alternate theme`);
}

assert.doesNotMatch(globals, /data-theme=.*onClick|ThemeToggle/, "dark-mode readiness must not introduce a launch theme switch");

console.log("JLC-0206 dark-mode token readiness checks passed");
