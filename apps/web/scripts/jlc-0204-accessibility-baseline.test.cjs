const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const globals = read("src/app/globals.css");
const tokens = read("src/lib/design-system/tokens.ts");
const button = read("src/components/ui/Button.tsx");
const input = read("src/components/ui/Input.tsx");
const modal = read("src/components/ui/Modal.tsx");
const drawer = read("src/components/ui/Drawer.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");

assert.match(globals, /body\s*\{[\s\S]*?font-size:\s*1rem;/, "primary body copy must be at least 16px");
assert.match(tokens, /body:\s*\["1rem"/, "body typography token must be 16px");
assert.match(button, /min-w-11/, "shared buttons must meet the 44px minimum width");
assert.match(button, /sm: "min-h-11/, "small shared buttons must meet the 44px minimum height");
assert.match(button, /md: "h-11/, "medium shared buttons must meet the 44px minimum height");
assert.match(button, /lg: "h-12/, "large shared buttons must exceed the 44px minimum height");
assert.match(input, /"h-11 px-3"/, "text inputs must meet 44px hit targets");
assert.match(input, /<label htmlFor=\{id\}/, "shared fields must render programmatic labels when supplied");
assert.match(input, /aria-describedby=\{describedBy\}/, "shared fields must associate helper/error text");
assert.match(input, /aria-invalid=\{Boolean\(error\) \|\| undefined\}/, "shared fields must expose invalid state");
assert.match(input, /role="alert"/, "field errors must be announced as text, not color alone");
assert.match(input, /checked \? "bg-oto-accent" : "bg-oto-border"/, "toggle state must include a non-color positional indicator");
assert.match(modal, /min-h-11 min-w-11/, "modal close control must meet 44px hit target");
assert.match(drawer, /min-h-11 min-w-11/, "drawer close control must meet 44px hit target");
assert.match(bottomNav, /min-h-16/, "mobile navigation targets must exceed 44px");

console.log("JLC-0204 accessibility baseline contract checks passed");
