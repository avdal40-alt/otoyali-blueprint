-- AI-01G-B1: preserve private G-A moderation history while allowing a bounded,
-- auditable contextual layer. No prompt, response, seller text, or JSON payload
-- is stored here.
BEGIN;

ALTER TABLE marketplace.listing_moderation_runs
  ADD COLUMN provider_id TEXT,
  ADD COLUMN model_id TEXT,
  ADD COLUMN prompt_schema_version TEXT;

ALTER TABLE marketplace.listing_moderation_runs
  ADD CONSTRAINT listing_moderation_runs_provider_id_check
    CHECK (provider_id IS NULL OR char_length(trim(provider_id)) BETWEEN 1 AND 80),
  ADD CONSTRAINT listing_moderation_runs_model_id_check
    CHECK (model_id IS NULL OR char_length(trim(model_id)) BETWEEN 1 AND 120),
  ADD CONSTRAINT listing_moderation_runs_prompt_schema_version_check
    CHECK (prompt_schema_version IS NULL OR char_length(trim(prompt_schema_version)) BETWEEN 1 AND 120);

ALTER TABLE marketplace.listing_moderation_signals
  DROP CONSTRAINT listing_moderation_signals_code_check,
  DROP CONSTRAINT listing_moderation_signals_confidence_check,
  DROP CONSTRAINT listing_moderation_signals_source_check,
  DROP CONSTRAINT listing_moderation_signals_evidence_excerpt_check;

ALTER TABLE marketplace.listing_moderation_signals
  ADD CONSTRAINT listing_moderation_signals_code_check
    CHECK (code IN ('PROFANITY_OR_ABUSE', 'CONTACT_IN_TEXT', 'EXTERNAL_LINK', 'SPAM_PATTERN', 'NONSENSE_OR_EXCESSIVE_REPETITION', 'HARASSMENT', 'THREAT', 'HATE_OR_DEHUMANIZING_LANGUAGE', 'SEMANTIC_SPAM', 'SEMANTIC_NONSENSE', 'CONTACT_OR_LINK_BYPASS')),
  ADD CONSTRAINT listing_moderation_signals_confidence_check
    CHECK (confidence IN ('low', 'medium', 'high')),
  ADD CONSTRAINT listing_moderation_signals_source_check
    CHECK (source IN ('deterministic', 'contextual_ai', 'ai', 'system')),
  ADD CONSTRAINT listing_moderation_signals_evidence_excerpt_check
    CHECK (evidence_excerpt IN ('[abusive-term]', '[phone]', '[contact-handle]', '[external-link]', '[repetition]', '[excessive-punctuation]', '[contextual-abuse]', '[targeted-harassment]', '[explicit-threat]', '[dehumanizing-language]', '[semantic-spam]', '[semantic-nonsense]', '[contextual-contact-bypass]'));

COMMENT ON COLUMN marketplace.listing_moderation_runs.provider_id IS 'Safe provider family identifier for contextual AI runs only; never a credential.';
COMMENT ON COLUMN marketplace.listing_moderation_runs.model_id IS 'Safe configured model identifier for contextual AI runs only.';
COMMENT ON COLUMN marketplace.listing_moderation_runs.prompt_schema_version IS 'Version identifier for the contextual output contract; never raw prompt text.';

NOTIFY pgrst, 'reload schema';
COMMIT;
