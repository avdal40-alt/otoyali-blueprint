const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/20260929135207_ai_01g_c_multimodal_moderation_signal_contract.sql"),
  "utf8",
);

for (const code of [
  "PROFANITY_OR_ABUSE", "CONTACT_IN_TEXT", "EXTERNAL_LINK", "SPAM_PATTERN",
  "NONSENSE_OR_EXCESSIVE_REPETITION", "HARASSMENT", "THREAT",
  "HATE_OR_DEHUMANIZING_LANGUAGE", "SEMANTIC_SPAM", "SEMANTIC_NONSENSE",
  "CONTACT_OR_LINK_BYPASS", "CONTACT_IN_IMAGE", "QR_CODE_PRESENT",
  "LOW_QUALITY_IMAGE", "POSSIBLE_VISIBLE_DAMAGE", "POSSIBLE_DUPLICATE_IMAGE",
  "POSSIBLE_VEHICLE_MISMATCH", "PRICE_ANOMALY",
]) assert.match(migration, new RegExp(`'${code}'`));

for (const evidence of [
  "[abusive-term]", "[phone]", "[contact-handle]", "[external-link]", "[repetition]",
  "[excessive-punctuation]", "[contextual-abuse]", "[targeted-harassment]",
  "[explicit-threat]", "[dehumanizing-language]", "[semantic-spam]",
  "[semantic-nonsense]", "[contextual-contact-bypass]", "[contact-overlay]",
  "[qr-present]", "[low-quality-image]", "[possible-visible-damage]",
  "[exact-duplicate-image]", "[cross-listing-duplicate-image]",
  "[possible-vehicle-mismatch]", "[price-outside-comparable-distribution]",
]) assert.match(migration, new RegExp(evidence.replace(/[\[\]]/g, "\\$&")));

assert.match(migration, /DROP CONSTRAINT listing_moderation_signals_code_check/);
assert.match(migration, /DROP CONSTRAINT listing_moderation_signals_evidence_excerpt_check/);
assert.doesNotMatch(migration, /CREATE TABLE|ADD COLUMN|ENABLE ROW LEVEL SECURITY|CREATE POLICY|GRANT\s|raw_prompt|raw_response|provider_payload|base64|storage\.objects/i);
console.log("AI-01G-C1 multimodal moderation persistence contract passed");
