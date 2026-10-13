const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const compile = (source, bindings = {}) => {
  const module = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", ...Object.keys(bindings), output)(module.exports, module, ...Object.values(bindings));
  return module.exports;
};
const rules = compile(read("src", "features", "ai", "moderation", "deterministic-rules.ts").replace(/import "server-only";\r?\n/, ""));
const moderation = compile(read("src", "features", "ai", "moderation", "deterministic-text-moderation.ts").replace(/import "server-only";\r?\n/, "").replace(/import \{ ([^}]+) \} from "\.\/deterministic-rules";/, "const { $1 } = rules;"), { rules });
const duplicate = moderation.moderateListingText({ description: "ordinary listing", sellerNotes: null, antiFraud: { duplicateContent: true } });
const bulk = moderation.moderateListingText({ description: "ordinary listing", sellerNotes: null, antiFraud: { recentListingCount: 10 } });
for (const result of [duplicate, bulk]) assert.equal(result.recommendedAction, "review", "anti-fraud signals are review-only");
assert.ok(duplicate.signals.some((signal) => signal.code === "DUPLICATE_LISTING_CONTENT" && signal.field === "listing"));
assert.ok(bulk.signals.some((signal) => signal.code === "SUSPICIOUS_BULK_ACTIVITY" && signal.field === "listing"));
assert.equal(duplicate.signals.some((signal) => signal.recommendedAction === "block"), false, "anti-fraud must not auto-punish");

const migration = read("..", "..", "supabase", "migrations", "20261013100000_jlc0703_preserve_moderation_signal_contract.sql");
for (const code of ["DUPLICATE_LISTING_CONTENT", "SUSPICIOUS_BULK_ACTIVITY", "POSSIBLE_DUPLICATE_IMAGE", "POSSIBLE_VEHICLE_MISMATCH", "PRICE_ANOMALY", "CONTACT_OR_LINK_BYPASS"]) assert.match(migration, new RegExp(code));
const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();
const constraint = query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'marketplace.listing_moderation_signals'::regclass AND conname = 'listing_moderation_signals_code_check';");
for (const code of ["DUPLICATE_LISTING_CONTENT", "SUSPICIOUS_BULK_ACTIVITY", "POSSIBLE_DUPLICATE_IMAGE", "POSSIBLE_VEHICLE_MISMATCH", "PRICE_ANOMALY", "CONTACT_OR_LINK_BYPASS"]) assert.match(constraint, new RegExp(code));
const boundary = query("SELECT relrowsecurity, has_table_privilege('anon','marketplace.listing_moderation_signals','SELECT'), has_table_privilege('authenticated','marketplace.listing_moderation_signals','INSERT'), has_function_privilege('anon','public.review_listing_moderation_with_override(uuid,uuid,text,text,text)','EXECUTE'), has_function_privilege('authenticated','public.review_listing_moderation_with_override(uuid,uuid,text,text,text)','EXECUTE') FROM pg_class WHERE oid='marketplace.listing_moderation_signals'::regclass;").split("|");
assert.deepEqual(boundary, ["t", "f", "f", "f", "t"], "signals stay private and the audited moderator RPC stays authenticated-only");
console.log("JLC-0703 anti-fraud and moderation security contract passed");
