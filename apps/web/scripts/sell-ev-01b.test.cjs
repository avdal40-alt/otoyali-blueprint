const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Execute actual production expressions/functions without mounting or connecting to Supabase.
const source = fs.readFileSync(path.join(__dirname, "../src/app/sell/_components/SellWizard.tsx"), "utf8");
const file = ts.createSourceFile("SellWizard.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = [];
function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(file);
function run(code, context = {}) {
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return Function(...Object.keys(context), compiled)(...Object.values(context));
}
function declaration(name) {
  const node = nodes.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, name);
  return node.getText(file);
}
function property(name, containing) {
  const node = nodes.find(n => ts.isPropertyAssignment(n) && n.name.getText(file) === name
    && (!containing || n.parent.getText(file).includes(containing)));
  assert.ok(node, name);
  return node.initializer.getText(file);
}
const initial = nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(file) === "initialState");
const base = { ...run(`return ${initial.initializer.getText(file)};`), makeId: "make", modelId: "model",
  year: "2020", mileageKm: "100", priceAmount: "10000", city: "Istanbul" };
const copy = { invalidVehicleFields: "invalid", combustionDisplacement: "required", electricDisplacement: "electric" };
const validate = state => run(`${declaration("validYear")}\n${declaration("validateStep")}\n${declaration("validateForPublish")}\nreturn validateForPublish(state, copy);`, { state, copy });
const create = state => run(`return ${property("engine_volume_l")};`, { state });
const restore = draft => run(`${declaration("draftStorageKey")}\n${declaration("readStoredDraft")}\nreturn readStoredDraft("user");`, {
  window: { localStorage: { getItem: () => JSON.stringify(draft) } }
});
function change(state, fuelType) {
  const dirty = new Set();
  run(`${declaration("update")}\nupdate("fuelType", fuelType);`, {
    mode: "editRejected", fuelType,
    setState: fn => { state = fn(state); },
    setDirtyEditFields: fn => { for (const key of fn(dirty)) dirty.add(key); }
  });
  return { state, dirty };
}
function edit(state, original, dirty = new Set()) {
  const raw = (key, value) => dirty.has(key) ? value : original[key];
  const engineVolumeL = run(`return ${property("engineVolumeL", 'makeId: raw(')};`, { state, raw });
  return run(`return ${property("p_engine_volume_l")};`, { submittedSnapshot: { engineVolumeL }, state, raw });
}
let bev = change({ ...base, engineVolumeL: "2" }, "electric");
assert.equal(bev.state.engineVolumeL, "");
assert.ok(bev.dirty.has("fuelType") && bev.dirty.has("engineVolumeL"));
assert.equal(validate(bev.state), null);
assert.ok(source.includes('{state.fuelType !== "electric" ? ('), "BEV displacement stays hidden");
assert.equal(create(bev.state), null);
for (const legacy of ["1", "0", "2.5"]) {
  const restored = restore({ ...base, fuelType: "electric", engineVolumeL: legacy });
  assert.equal(restored.engineVolumeL, "");
  assert.equal(validate(restored), null);
  assert.equal(create({ ...restored, engineVolumeL: legacy }), null, "Create boundary rejects hidden stale values");
  const loaded = run(`return ${property("engineVolumeL", "vehicle.make_id")};`, {
    vehicle: { fuel_type: "electric", engine_volume_l: Number(legacy) }
  });
  assert.equal(loaded, "", "Rejected edit restoration normalizes legacy displacement");
  assert.equal(edit(restored, { engineVolumeL: legacy }), null, "Untouched original cannot escape into RPC");
  assert.equal(edit({ ...restored, engineVolumeL: legacy }, { engineVolumeL: legacy }), null);
}
const hybrid = change(bev.state, "hybrid").state;
assert.equal(validate(hybrid), "invalid");
assert.equal(validate({ ...hybrid, engineVolumeL: "1.6" }), null);
for (const fuelType of ["gasoline", "diesel", "lpg", "hybrid", "other"]) {
  for (const engineVolumeL of ["", "0", "-1", "invalid"]) {
    const state = { ...base, fuelType, engineVolumeL };
    assert.equal(validate(state), "invalid", `${fuelType}: ${engineVolumeL}`);
    assert.equal(restore(state).engineVolumeL, engineVolumeL, "Non-electric drafts are unchanged");
  }
  const state = { ...base, fuelType, engineVolumeL: "1.6" };
  assert.equal(validate(state), null);
  assert.equal(create(state), 1.6);
  assert.equal(edit(state, { engineVolumeL: "2" }), "2", "Untouched non-electric value preserved");
  assert.equal(edit(state, { engineVolumeL: "2" }, new Set(["engineVolumeL"])), "1.6");
}
assert.equal(validate({ ...base, fuelType: "electric", engineVolumeL: "0" }), "invalid");
console.log("EV-01B BEV restoration, create/edit payload and displacement regressions passed");
