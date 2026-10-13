const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const button = read("src/components/ui/Button.tsx");
const input = read("src/components/ui/Input.tsx");
const modal = read("src/components/ui/Modal.tsx");
const drawer = read("src/components/ui/Drawer.tsx");
const dialogFocus = read("src/components/ui/useDialogFocus.ts");
const mobileFilterDrawer = read("src/components/search/MobileFilterDrawer.tsx");
const appHeader = read("src/components/layout/AppHeader.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");

assert.match(button, /min-w-11/, "shared action controls retain 44px minimum width");
assert.match(button, /focus-visible:ring-2/, "shared action controls retain a visible keyboard focus state");
assert.match(input, /aria-invalid/, "shared fields expose invalid state to assistive technology");
assert.match(input, /role="alert"/, "shared field errors announce text feedback");
assert.match(dialogFocus, /event\.key === "Escape"/, "dialogs close with Escape when a close handler is supplied");
assert.match(dialogFocus, /event\.key !== "Tab"/, "dialogs handle Tab navigation");
assert.match(dialogFocus, /previouslyFocused\?\.isConnected/, "dialogs restore focus to their trigger after close");
assert.match(modal, /useDialogFocus\(open, dialogRef, onClose\)/, "modal uses shared keyboard focus management");
assert.match(modal, /ref=\{dialogRef\}/, "modal owns a focus target");
assert.match(drawer, /useDialogFocus\(open, dialogRef, onClose\)/, "drawer uses shared keyboard focus management");
assert.match(drawer, /ref=\{dialogRef\}/, "drawer owns a focus target");
assert.match(mobileFilterDrawer, /useDialogFocus\(open, dialogRef, onClose\)/, "mobile filters use shared keyboard focus management");
assert.match(mobileFilterDrawer, /role="dialog" aria-modal="true" aria-labelledby="mobile-filter-drawer-title"/, "mobile filters expose dialog semantics");
assert.match(appHeader, /min-h-11 min-w-11/, "header icon controls retain 44px targets");
assert.match(bottomNav, /min-h-16/, "mobile navigation targets exceed the 44px minimum");

console.log("JLC-1203 accessibility release audit contract checks passed");
