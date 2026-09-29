const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const root = path.resolve(__dirname, ".."); const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const source = read("src/features/ai/moderation/contextual-moderation.ts");
for (const marker of ["untrusted data", "outputSchema", ".strict()", "THREAT", "HATE_OR_DEHUMANIZING_LANGUAGE", "SEMANTIC_SPAM", "SEMANTIC_NONSENSE", "CONTACT_OR_LINK_BYPASS", "AI_MODERATION_ENABLED"]) assert.match(source, new RegExp(marker, "i"));
assert.doesNotMatch(source, /raw_prompt|raw_response|provider_payload|listing\.status/i);
const migration = read("..", "..", "supabase", "migrations", "20260929002000_ai_01g_b_contextual_moderation_provenance.sql");
for (const marker of ["provider_id", "model_id", "prompt_schema_version", "HARASSMENT", "THREAT", "contextual_ai"]) assert.match(migration, new RegExp(marker));
assert.doesNotMatch(migration, /jsonb|raw_prompt|raw_response|provider_payload/i);
console.log("AI-01G-B contextual moderation contract passed");
