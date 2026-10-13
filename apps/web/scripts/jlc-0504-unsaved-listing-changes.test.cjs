const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "app", "sell", "unsaved-listing-changes.ts"), "utf8");
const wizard = fs.readFileSync(path.join(root, "src", "app", "sell", "_components", "SellWizard.tsx"), "utf8");
const copy = fs.readFileSync(path.join(root, "src", "app", "sell", "sell-copy.ts"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const testModule = { exports: {} };
new Function("exports", "module", output)(testModule.exports, testModule);
const { createListingDraftChangeSnapshot, hasMeaningfulListingChanges } = testModule.exports;

const base = {
  makeId: "", modelId: "", year: "", city: "Almaty", condition: "used", sellerType: "private",
  mileageKm: "", fuelType: "gasoline", transmission: "automatic", bodyType: "", driveType: "", color: "",
  engineVolumeL: "", damageState: "unknown", ownerCount: "", priceAmount: "", currency: "KZT",
  priceNegotiable: true, description: "", photoCount: 0, sellerContactId: "contact-1"
};
const baseline = createListingDraftChangeSnapshot(base);
assert.equal(hasMeaningfulListingChanges(baseline, base), false, "A hydrated draft must not warn before a seller change");
assert.equal(hasMeaningfulListingChanges(null, { ...base, description: "Pending hydration" }), false, "The guard stays inactive until its baseline exists");
assert.equal(hasMeaningfulListingChanges(baseline, { ...base, description: "One owner" }), true, "Text edits are meaningful");
assert.equal(hasMeaningfulListingChanges(baseline, { ...base, photoCount: 1 }), true, "Photo additions are meaningful");
assert.equal(hasMeaningfulListingChanges(baseline, { ...base, sellerContactId: "contact-2" }), true, "Changing the selected seller contact is meaningful");

assert.ok(wizard.includes('document.addEventListener("click", interceptSameOriginNavigation, true)'), "Same-origin navigation outside the form is intercepted");
assert.ok(wizard.includes('event.metaKey || event.ctrlKey || event.shiftKey || event.altKey'), "Modified links retain their browser behavior");
assert.ok(wizard.includes('onClose={() => setPendingNavigation(null)}'), "The dialog has an accessible dismiss path");
assert.ok(!wizard.includes("hasUnsavedDraft"), "The old non-empty-draft heuristic is not used");
assert.ok(wizard.includes('onClick={() => continueNavigation(true)}'), "Save draft and leave is wired to the guarded destination");
assert.ok(wizard.includes('onClick={() => continueNavigation(false)}'), "Discard and leave is wired to the guarded destination");
assert.ok(wizard.includes('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'), "The three actions remain usable on compact and desktop layouts");
for (const key of ["unsavedChangesTitle", "unsavedChangesBody", "continueEditing", "saveDraftAndLeave", "discardAndLeave"]) {
  assert.ok(copy.includes(`${key}:`), `Localized unsaved-change copy is present: ${key}`);
}

console.log("JLC-0504 unsaved listing changes tests passed.");
