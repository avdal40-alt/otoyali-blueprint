const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const engineSource = read("src", "features", "ai", "moderation", "deterministic-text-moderation.ts").replace('import "server-only";\n', "").replace(/import \{ ([^}]+) \} from "\.\/deterministic-rules";/, "const { $1 } = rules;");
const rulesSource = read("src", "features", "ai", "moderation", "deterministic-rules.ts").replace('import "server-only";\n', "");
const compile = (source, bindings = {}) => { const module = { exports: {} }; const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; new Function("exports", "module", ...Object.keys(bindings), output)(module.exports, module, ...Object.values(bindings)); return module.exports; };
const rules = compile(rulesSource);
const { moderateListingText, normalizeModerationText } = compile(engineSource, { rules });
const clean = (description) => moderateListingText({ description, sellerNotes: null });

assert.equal(normalizeModerationText("İLAN İyi").normalized, "ilan iyi");
assert.equal(normalizeModerationText("s.a-l/a*k").compactSegments.includes("salak"), true);
assert.equal(normalizeModerationText("s.4-l/4*k").compactSegments.includes("salak"), true);
assert.equal(normalizeModerationText("Saaalaaak").normalized.includes("salak"), true);
assert.equal(normalizeModerationText("сaлaк").normalized.includes("calak"), true);
assert.equal(clean("2020 model, 120000 km, 1.6 motor, 950000 TL").recommendedAction, "allow");

assert.equal(clean("Bu satıcı salak.").recommendedAction, "ask_edit");
assert.equal(clean("s.a-l/a*k yazmayın").signals.some((signal) => signal.code === "PROFANITY_OR_ABUSE"), true);
assert.equal(clean("Saaalaaak").signals.some((signal) => signal.code === "PROFANITY_OR_ABUSE"), true);
assert.equal(clean("Passat temiz aile aracı").signals.some((signal) => signal.code === "PROFANITY_OR_ABUSE"), false);
assert.equal(clean("дурак").signals.some((signal) => signal.code === "PROFANITY_OR_ABUSE"), true);
assert.equal(clean("ақымақ").signals.some((signal) => signal.code === "PROFANITY_OR_ABUSE"), true);
assert.notEqual(clean("aptal").recommendedAction, "block");

for (const contact of ["0532 123 45 67", "+90 (532) 123-45-67", "WhatsApp: 05321234567"]) assert.equal(clean(contact).signals.some((signal) => signal.code === "CONTACT_IN_TEXT"), true);
for (const ordinary of ["2020 model 120000 km", "950000 TL", "1.6 motor 150 hp"]) assert.equal(clean(ordinary).signals.some((signal) => signal.code === "CONTACT_IN_TEXT"), false);

for (const link of ["https://example.com/ilan", "www.example.com", "example.com", "example dot com"]) assert.equal(clean(link).signals.some((signal) => signal.code === "EXTERNAL_LINK"), true);
assert.equal(clean("https://yolmod.com/ilan/1").signals.some((signal) => signal.code === "EXTERNAL_LINK"), false);
assert.equal(clean("Temiz, bakımlı ve aile kullanımı için uygundur.").recommendedAction, "allow");
assert.equal(clean("temiz temiz temiz temiz temiz temiz temiz").signals.some((signal) => signal.code === "SPAM_PATTERN"), true);
assert.equal(clean("!!!!!!!!!!!!!!!!!!!!!!!!!!").signals.some((signal) => signal.code === "NONSENSE_OR_EXCESSIVE_REPETITION"), true);

const migration = read("..", "..", "supabase", "migrations", "20260929001000_ai_01g_a_moderation_foundation.sql");
assert.match(migration, /listing_moderation_runs/); assert.match(migration, /ENABLE ROW LEVEL SECURITY/); assert.match(migration, /REVOKE ALL[\s\S]*authenticated/); assert.match(migration, /public\.is_admin\(auth\.uid\(\)\)/); assert.doesNotMatch(migration, /raw_text|prompt_payload|response_payload/i);
const runtime = read("src", "features", "ai", "moderation", "listing-moderation-runtime.ts");
assert.match(runtime, /import "server-only"/); assert.match(runtime, /eq\("seller_id", authenticated\.userId\)/); assert.match(runtime, /SUPABASE_SERVICE_ROLE_KEY/); assert.doesNotMatch(runtime, /app\/api/);
console.log("AI-01G-A deterministic moderation contract passed");
