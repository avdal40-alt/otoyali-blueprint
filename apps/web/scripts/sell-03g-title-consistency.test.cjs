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

assert.equal(generateVehicleListingTitle({ makeName: "Abarth", modelName: "500", year: 2026 }), "Abarth 500 2026");
assert.equal(generateVehicleListingTitle({ makeName: "\t", modelName: "Giulia", year: 2021 }), "Giulia 2021");
assert.equal(generateVehicleListingTitle({ makeName: "Alfa Romeo", modelName: "\n", year: 2021 }), "Alfa Romeo 2021");
assert.equal(generateVehicleListingTitle({ makeName: "\t", modelName: "\n", year: 2021 }), "2021");
assert.equal(generateVehicleListingTitle({ makeName: "  Alfa   Romeo  ", modelName: " Giulia ", year: 2021 }), "Alfa Romeo Giulia 2021");
assert.equal(generateVehicleListingTitle({ makeName: "Togg", modelName: "T10X", year: 2024 }), "Togg T10X 2024");
assert.equal(generateVehicleListingTitle({ makeName: "Çukurova", modelName: "Şahin İ", year: 2020 }), "Çukurova Şahin İ 2020");
assert.equal(generateVehicleListingTitle({ makeName: "\tAlfa\r\nRomeo\v", modelName: "\fGiulia\tVeloce\n", year: 2021 }), "Alfa Romeo Giulia Veloce 2021");
assert.equal(generateVehicleListingTitle({ makeName: "Abarth", modelName: "500", year: 2026, trim: "Esseesse" }), "Abarth 500 2026");
assert.equal(generateVehicleListingTitle({ makeName: "Abarth", modelName: null, year: 2022 }), "Abarth 2022");
assert.equal(generateVehicleListingTitle({ makeName: undefined, modelName: null, year: null }), "");
// The cross-runtime contract intentionally normalizes ASCII whitespace only.
assert.equal(generateVehicleListingTitle({ makeName: "Alfa\u00a0Romeo", modelName: "Giulia", year: 2021 }), "Alfa\u00a0Romeo Giulia 2021");
assert.equal(generateVehicleListingTitle({ makeName: "\u00a0Alfa\u00a0", modelName: "Giulia", year: 2021 }), "\u00a0Alfa\u00a0 Giulia 2021");

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

const titleBlockStart = editMigration.indexOf("v_canonical_title := v_listing.title;");
const vehicleUpdateStart = editMigration.indexOf("UPDATE vehicle.vehicle_profiles", titleBlockStart);
assert.ok(titleBlockStart >= 0 && vehicleUpdateStart > titleBlockStart);
const titleBlock = editMigration.slice(titleBlockStart, vehicleUpdateStart);
const generatedBranchMatch = titleBlock.match(/IF v_listing\.title_generated THEN([\s\S]*?)END IF;/);
assert.ok(generatedBranchMatch, "Generated-title branch must be guarded by title_generated=true");
const generatedBranch = generatedBranchMatch[1];

// Generated titles are recomputed on every successful edit, not only when
// vehicle identity is dirty. Custom titles retain the initialized stored title.
assert.match(titleBlock, /v_canonical_title := v_listing\.title;\s*IF v_listing\.title_generated THEN/);
assert.doesNotMatch(titleBlock, /IS DISTINCT FROM/);
assert.match(titleBlock, /WHERE mk\.id = p_make_id AND m\.id = p_model_id/);
assert.equal((titleBlock.match(/v_canonical_title\s*:=/g) ?? []).length, 1,
  "Only the stored-title initialization may assign v_canonical_title with :=");
assert.equal((titleBlock.match(/INTO v_canonical_title/g) ?? []).length, 1,
  "Exactly one generated-title SELECT may assign v_canonical_title");
assert.match(generatedBranch, /INTO v_canonical_title/,
  "Generated-title assignment must remain inside the title_generated=true branch");
assert.doesNotMatch(editMigration, /\btitle_generated\s*:=|\btitle_generated\s*=/i,
  "The persisted title_generated flag must never be mutated");

// SQL must normalize each authoritative catalog label with the same explicit
// ASCII whitespace domain as the production helper before joining the parts.
const asciiWhitespacePattern = /'\[' \|\| chr\(9\) \|\| chr\(10\) \|\| chr\(11\) \|\| chr\(12\) \|\| chr\(13\) \|\| ' \]\+'/g;
assert.equal([...titleBlock.matchAll(asciiWhitespacePattern)].length, 2);
assert.equal((titleBlock.match(/btrim\(regexp_replace\(/g) ?? []).length, 2);
assert.equal((titleBlock.match(/NULLIF\(btrim\(regexp_replace\(/g) ?? []).length, 2,
  "Both normalized catalog labels must omit empty strings before concat_ws");
assert.doesNotMatch(titleBlock, /concat_ws\(' ',\s*mk\.name,\s*m\.name/i);
assert.doesNotMatch(titleBlock, /\b(?:trim|variant)(?:_id|_name)?\b/i);

function extractSqlCall(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0, `Missing SQL call: ${marker}`);
  const openIndex = source.indexOf("(", markerIndex);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  assert.fail(`Unterminated SQL call: ${marker}`);
}

const concatArguments = extractSqlCall(generatedBranch, "concat_ws");
const makePosition = concatArguments.indexOf("mk.name");
const modelPosition = concatArguments.indexOf("m.name");
const yearPosition = concatArguments.indexOf("p_year::TEXT");
assert.ok(makePosition >= 0 && makePosition < modelPosition && modelPosition < yearPosition,
  "Generated title field order must be make + model + year");
assert.equal((concatArguments.match(/p_year::TEXT/g) ?? []).length, 1,
  "Generated title must include year exactly once");
assert.equal((concatArguments.match(/NULLIF\(/g) ?? []).length, 2,
  "concat_ws must receive two empty-to-NULL normalized text components");

function normalizeLikeRejectedEditSql(value) {
  return String(value).replace(/[\t\n\v\f\r ]+/g, " ").replace(/^ | $/g, "");
}

function generatedTitleLikeRejectedEditSql(makeName, modelName, year) {
  return [makeName, modelName, year].map(normalizeLikeRejectedEditSql).filter(Boolean).join(" ");
}

const equivalenceCases = [
  ["Abarth", "500", 2026],
  ["\t", "Giulia", 2021],
  ["Alfa Romeo", "\n", 2021],
  ["\t", "\n", 2021],
  ["  Alfa   Romeo  ", " Giulia ", 2021],
  ["\tAlfa\r\nRomeo", "Giulia\vVeloce\f", 2021],
  ["Çukurova", "Şahin İ", 2020],
  ["Abarth", "500", 2024]
];
for (const [makeName, modelName, year] of equivalenceCases) {
  assert.equal(
    generateVehicleListingTitle({ makeName, modelName, year }),
    generatedTitleLikeRejectedEditSql(makeName, modelName, year)
  );
}

function persistedRejectedEditTitle({ storedTitle, titleGenerated, makeName, modelName, year }) {
  return titleGenerated ? generatedTitleLikeRejectedEditSql(makeName, modelName, year) : storedTitle;
}

assert.equal(persistedRejectedEditTitle({
  storedTitle: "2021 Abarth 500 Lounge",
  titleGenerated: true,
  makeName: "Abarth",
  modelName: "500",
  year: 2021
}), "Abarth 500 2021");
assert.equal(persistedRejectedEditTitle({
  storedTitle: "My perfect Abarth",
  titleGenerated: false,
  makeName: "Abarth",
  modelName: "500",
  year: 2021
}), "My perfect Abarth");

// Only the final year changed; the unchanged effective catalog identity still
// participates in the regenerated title.
assert.equal(persistedRejectedEditTitle({
  storedTitle: "Abarth 500 2021",
  titleGenerated: true,
  makeName: "Abarth",
  modelName: "500",
  year: 2024
}), "Abarth 500 2024");

// Original stale-model regression: changing make clears the model selection,
// and only the subsequently selected model may enter preview/persistence.
assert.equal(generateVehicleListingTitle({ makeName: "BMW", modelName: null, year: 2021 }), "BMW 2021");
assert.ok(!generateVehicleListingTitle({ makeName: "BMW", modelName: null, year: 2021 }).includes("500"));
assert.equal(generateVehicleListingTitle({ makeName: "BMW", modelName: "320i", year: 2021 }), "BMW 320i 2021");
assert.equal(persistedRejectedEditTitle({
  storedTitle: "Abarth 500 2021",
  titleGenerated: true,
  makeName: "BMW",
  modelName: "320i",
  year: 2021
}), "BMW 320i 2021");

assert.ok(seo.includes("listing.title || generateVehicleListingTitle({"));
assert.ok(seo.includes("year: listing.year"));

console.log("SELL-03G generated listing title consistency tests passed.");
