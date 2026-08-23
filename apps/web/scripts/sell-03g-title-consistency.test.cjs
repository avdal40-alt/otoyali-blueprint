const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const helperSource = read(projectRoot, "src", "lib", "marketplace", "listing-title.ts");
const wizard = read(projectRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const seo = read(projectRoot, "src", "components", "seo", "MarketplaceSeoPage.tsx");
const editMigration = read(repoRoot, "supabase", "migrations", "20260724120000_sell03_rejected_listing_editing.sql");

function loadProductionHelper() {
  const output = ts.transpileModule(helperSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", output)(module.exports, module);
  return module.exports.generateVehicleListingTitle;
}

const generateVehicleListingTitle = loadProductionHelper();

assert.equal(generateVehicleListingTitle({ makeName: "Abarth", modelName: "500", year: 2022 }), "Abarth 500 2022");
assert.equal(generateVehicleListingTitle({ makeName: "  Alfa   Romeo ", modelName: " Giulia  Quadrifoglio ", year: " 2021 " }), "Alfa Romeo Giulia Quadrifoglio 2021");
assert.equal(generateVehicleListingTitle({ makeName: "Togg", modelName: "T10X", year: 2024 }), "Togg T10X 2024");
assert.equal(generateVehicleListingTitle({ makeName: "Çukurova", modelName: "Şahin İ", year: 2020 }), "Çukurova Şahin İ 2020");
assert.equal(generateVehicleListingTitle({ makeName: "Abarth", modelName: null, year: 2022 }), "Abarth 2022");
assert.equal(generateVehicleListingTitle({ makeName: undefined, modelName: null, year: null }), "");

const uuid = "a739b073-2095-4fb9-9aa4-9b74a1ed8f60";
assert.ok(!generateVehicleListingTitle({ makeName: "Abarth", modelName: "500", year: 2022 }).includes(uuid));
assert.ok(!generateVehicleListingTitle({ makeName: undefined, modelName: null, year: 2022 }).match(/undefined|null/));

assert.ok(wizard.includes('import { generateVehicleListingTitle } from "@/lib/marketplace/listing-title"'));
assert.ok(wizard.includes("const generatedTitle = generateVehicleListingTitle({"));
assert.ok(wizard.includes("modelName: selectedModel?.make_id === state.makeId ? selectedModel.model_name : null"));
assert.ok(wizard.includes('? (existingTitleGenerated ? generatedTitle : existingTitle)'));
assert.ok(wizard.includes("title: generatedTitle"));
assert.ok(!wizard.includes("function generateListingTitle("));
assert.ok(!wizard.includes("canPreviewRegeneratedTitle"));

const makeChangeStart = wizard.indexOf("function updateMake(makeId: string)");
const makeChangeEnd = wizard.indexOf("function updateProfile", makeChangeStart);
const makeChange = wizard.slice(makeChangeStart, makeChangeEnd);
assert.ok(makeChange.includes('setState((current) => ({ ...current, makeId, modelId: "" }))'));
assert.ok(makeChange.includes("setModelsForMake([])"));

assert.ok(editMigration.includes("IF v_listing.title_generated"));
assert.ok(editMigration.includes("concat_ws(' ', mk.name, m.name, p_year::TEXT)"));
assert.ok(editMigration.includes("WHERE mk.id = p_make_id AND m.id = p_model_id"));
assert.ok(editMigration.includes("v_canonical_title := v_listing.title"));

assert.ok(seo.includes("listing.title || generateVehicleListingTitle({"));
assert.ok(seo.includes("year: listing.year"));

console.log("SELL-03G generated listing title consistency tests passed.");
