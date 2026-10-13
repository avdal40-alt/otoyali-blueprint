-- JLC-0703: preserve all later moderation classifications while adding
-- deterministic anti-fraud indicators. Signals remain review-only.
BEGIN;

ALTER TABLE marketplace.listing_moderation_signals
  DROP CONSTRAINT listing_moderation_signals_code_check;

ALTER TABLE marketplace.listing_moderation_signals
  ADD CONSTRAINT listing_moderation_signals_code_check
  CHECK (code IN (
    'PROFANITY_OR_ABUSE', 'CONTACT_IN_TEXT', 'EXTERNAL_LINK',
    'SPAM_PATTERN', 'NONSENSE_OR_EXCESSIVE_REPETITION',
    'HARASSMENT', 'THREAT', 'HATE_OR_DEHUMANIZING_LANGUAGE',
    'SEMANTIC_SPAM', 'SEMANTIC_NONSENSE', 'CONTACT_OR_LINK_BYPASS',
    'CONTACT_IN_IMAGE', 'QR_CODE_PRESENT', 'LOW_QUALITY_IMAGE',
    'POSSIBLE_VISIBLE_DAMAGE', 'POSSIBLE_DUPLICATE_IMAGE',
    'POSSIBLE_VEHICLE_MISMATCH', 'PRICE_ANOMALY',
    'DUPLICATE_LISTING_CONTENT', 'SUSPICIOUS_BULK_ACTIVITY'
  ));

COMMENT ON CONSTRAINT listing_moderation_signals_code_check
  ON marketplace.listing_moderation_signals IS
  'Closed privacy-safe moderation and review-only anti-fraud signal vocabulary.';

NOTIFY pgrst, 'reload schema';
COMMIT;
