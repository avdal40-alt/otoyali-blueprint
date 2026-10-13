const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const globals = read("src/app/globals.css");
const tokens = read("src/lib/design-system/tokens.ts");
const tailwind = read("tailwind.config.ts");
const button = read("src/components/ui/Button.tsx");
const states = read("src/components/ui/States.tsx");
const modal = read("src/components/ui/Modal.tsx");
const drawer = read("src/components/ui/Drawer.tsx");
const card = read("src/components/vehicle/VehicleCard.tsx");

// Shared motion stays short and is limited to feedback for deliberate user
// actions and transient UI states, rather than ornamental page movement.
assert.match(tokens, /fast: "120ms"[\s\S]*?base: "180ms"[\s\S]*?slow: "240ms"/);
assert.match(tailwind, /"oto-fade-in": "oto-fade-in 180ms ease-out"/);
assert.match(tailwind, /"oto-slide-up": "oto-slide-up 180ms ease-out"/);
assert.match(tailwind, /"oto-drawer-in": "oto-drawer-in 220ms ease-out"/);
assert.doesNotMatch(tailwind, /animation:[\s\S]*?\b(?:[3-9]\d\d|\d{4,})ms\b/);

assert.match(button, /active:scale-\[0\.98\] motion-reduce:active:scale-100/);
assert.match(states, /motion-safe:animate-oto-(?:slide-up|fade-in)/);
assert.match(modal, /animate-oto-slide-up/);
assert.match(drawer, /animate-oto-(?:fade-in|drawer-in|slide-up)/);
assert.match(card, /transition hover:-translate-y-0\.5 hover:shadow-oto/);

// The global fallback also protects animations introduced outside the shared
// components: reduced-motion users receive effectively no animated travel.
assert.match(
  globals,
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?animation-duration:\s*0\.01ms !important;[\s\S]*?transition-duration:\s*0\.01ms !important;/
);

console.log("JLC-0205 functional microanimation contract checks passed");
