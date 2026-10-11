-- JLC-0703: anti-fraud indicators are private, review-only signals.
BEGIN;

ALTER TABLE marketplace.listing_moderation_signals
  DROP CONSTRAINT listing_moderation_signals_code_check,
  DROP CONSTRAINT listing_moderation_signals_field_name_check;

ALTER TABLE marketplace.listing_moderation_signals
  ADD CONSTRAINT listing_moderation_signals_code_check CHECK (code IN ('PROFANITY_OR_ABUSE', 'CONTACT_IN_TEXT', 'EXTERNAL_LINK', 'SPAM_PATTERN', 'NONSENSE_OR_EXCESSIVE_REPETITION', 'DUPLICATE_LISTING_CONTENT', 'SUSPICIOUS_BULK_ACTIVITY')),
  ADD CONSTRAINT listing_moderation_signals_field_name_check CHECK (field_name IN ('description', 'seller_notes', 'listing'));

COMMIT;
