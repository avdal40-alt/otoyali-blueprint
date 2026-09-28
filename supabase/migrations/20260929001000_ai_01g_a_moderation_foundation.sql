-- AI-01G-A: private, append-only deterministic moderation evidence.
-- Seller text is deliberately excluded: only bounded redacted evidence classes
-- may be persisted by the trusted server runtime.
BEGIN;

CREATE TABLE marketplace.listing_moderation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  initiated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  engine TEXT NOT NULL CHECK (engine IN ('deterministic', 'ai', 'system')),
  ruleset_version TEXT NOT NULL CHECK (char_length(trim(ruleset_version)) BETWEEN 1 AND 120),
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('allow', 'ask_edit', 'review', 'block')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketplace.listing_moderation_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketplace.listing_moderation_runs(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code IN ('PROFANITY_OR_ABUSE', 'CONTACT_IN_TEXT', 'EXTERNAL_LINK', 'SPAM_PATTERN', 'NONSENSE_OR_EXCESSIVE_REPETITION')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high')),
  source TEXT NOT NULL CHECK (source IN ('deterministic', 'ai', 'system')),
  field_name TEXT NOT NULL CHECK (field_name IN ('description', 'seller_notes')),
  evidence_class TEXT NOT NULL CHECK (char_length(trim(evidence_class)) BETWEEN 1 AND 80),
  evidence_excerpt TEXT NOT NULL CHECK (evidence_excerpt IN ('[abusive-term]', '[phone]', '[contact-handle]', '[external-link]', '[repetition]', '[excessive-punctuation]')),
  rule_id TEXT NOT NULL CHECK (char_length(trim(rule_id)) BETWEEN 1 AND 120),
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('allow', 'ask_edit', 'review', 'block')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketplace.listing_moderation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketplace.listing_moderation_runs(id) ON DELETE CASCADE,
  moderator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'ask_edit', 'review', 'block')),
  reason_code TEXT CHECK (reason_code IS NULL OR char_length(trim(reason_code)) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX listing_moderation_runs_listing_created_idx ON marketplace.listing_moderation_runs (listing_id, created_at DESC);
CREATE INDEX listing_moderation_signals_run_idx ON marketplace.listing_moderation_signals (run_id);
CREATE INDEX listing_moderation_overrides_run_created_idx ON marketplace.listing_moderation_overrides (run_id, created_at DESC);

ALTER TABLE marketplace.listing_moderation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listing_moderation_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listing_moderation_overrides ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE marketplace.listing_moderation_runs, marketplace.listing_moderation_signals, marketplace.listing_moderation_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.listing_moderation_runs, marketplace.listing_moderation_signals, marketplace.listing_moderation_overrides TO authenticated;
GRANT ALL PRIVILEGES ON TABLE marketplace.listing_moderation_runs, marketplace.listing_moderation_signals, marketplace.listing_moderation_overrides TO service_role;

CREATE POLICY listing_moderation_runs_select_admins ON marketplace.listing_moderation_runs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY listing_moderation_signals_select_admins ON marketplace.listing_moderation_signals FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY listing_moderation_overrides_select_admins ON marketplace.listing_moderation_overrides FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

COMMENT ON TABLE marketplace.listing_moderation_runs IS 'Private AI-01G moderation run history. Browser roles cannot write; admin reads are RLS-gated.';
COMMENT ON TABLE marketplace.listing_moderation_signals IS 'Private minimized moderation evidence. No raw listing text, URL, phone, prompt, or model response is stored.';
COMMENT ON TABLE marketplace.listing_moderation_overrides IS 'Append-only human moderation decisions; machine run and signal history is never overwritten.';

NOTIFY pgrst, 'reload schema';

COMMIT;
