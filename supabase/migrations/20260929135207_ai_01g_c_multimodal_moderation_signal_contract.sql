-- AI-01G-C1: extend the closed, privacy-safe moderation classifications only.
BEGIN;

ALTER TABLE marketplace.listing_moderation_signals
  DROP CONSTRAINT listing_moderation_signals_code_check,
  DROP CONSTRAINT listing_moderation_signals_evidence_excerpt_check;

ALTER TABLE marketplace.listing_moderation_signals
  ADD CONSTRAINT listing_moderation_signals_code_check
    CHECK (code IN ('PROFANITY_OR_ABUSE', 'CONTACT_IN_TEXT', 'EXTERNAL_LINK', 'SPAM_PATTERN', 'NONSENSE_OR_EXCESSIVE_REPETITION', 'HARASSMENT', 'THREAT', 'HATE_OR_DEHUMANIZING_LANGUAGE', 'SEMANTIC_SPAM', 'SEMANTIC_NONSENSE', 'CONTACT_OR_LINK_BYPASS', 'CONTACT_IN_IMAGE', 'QR_CODE_PRESENT', 'LOW_QUALITY_IMAGE', 'POSSIBLE_VISIBLE_DAMAGE', 'POSSIBLE_DUPLICATE_IMAGE', 'POSSIBLE_VEHICLE_MISMATCH', 'PRICE_ANOMALY')),
  ADD CONSTRAINT listing_moderation_signals_evidence_excerpt_check
    CHECK (evidence_excerpt IN ('[abusive-term]', '[phone]', '[contact-handle]', '[external-link]', '[repetition]', '[excessive-punctuation]', '[contextual-abuse]', '[targeted-harassment]', '[explicit-threat]', '[dehumanizing-language]', '[semantic-spam]', '[semantic-nonsense]', '[contextual-contact-bypass]', '[contact-overlay]', '[qr-present]', '[low-quality-image]', '[possible-visible-damage]', '[exact-duplicate-image]', '[cross-listing-duplicate-image]', '[possible-vehicle-mismatch]', '[price-outside-comparable-distribution]'));

NOTIFY pgrst, 'reload schema';
COMMIT;
